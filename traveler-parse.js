// ======== traveler-parse.js 旅客進度表：在瀏覽器內解析 ERP 報表 ========
// 個資最小化：只輸出 遮罩姓名、缺漏欄位名稱、護照效期警示、尾款清 / 未清；完整個資不離開這台電腦
// 兩份報表用同樣方式算出 key = 訂單編號 + '|' + 姓名雜湊，才能對到同一位旅客
// 需要 SheetJS (XLSX) 與 crypto.subtle

(function (root) {
    // 要檢查是否有填寫的欄位 (label 顯示名稱，match 對應 ERP 標題的關鍵字)
    const FIELDS = [
        { label: '英文姓名', match: ['英文姓名'] },
        { label: '手機', match: ['手機'] },
        { label: 'Email', match: ['EMAIL', 'E-MAIL'] },
        { label: '身分證', match: ['身分證'] },
        { label: '生日', match: ['生日'] },
        { label: '護照號碼', match: ['護照號碼'] },
        { label: '護照效期', match: ['護照到期'] },
        { label: '身高', match: ['身高'], numeric: true },
        { label: '體重', match: ['體重'], numeric: true },
        { label: '腳長', match: ['腳長'], numeric: true },
        { label: 'LEVEL', match: ['LEVEL'] },
        { label: '滑雪類別', match: ['滑雪類別'] },
        { label: '分房', match: ['標準分房'] }
    ];

    // ERP 匯出的 .xls 會在訂單編號前夾帶看不見的控制字元 (例如 \u001b)，先去掉
    const clean = v => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f​﻿]/g, '').trim();
    const findCol = (headers, words) => headers.findIndex(h => words.some(w => clean(h).toUpperCase().indexOf(w) >= 0));
    const normOrder = v => clean(v).replace(/\.0+$/, '').replace(/^0+(?=\d)/, '');
    const normName = v => clean(v).replace(/\s+/g, '').toUpperCase();

    function normDate(v) {
        if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}/${String(v.getMonth() + 1).padStart(2, '0')}/${String(v.getDate()).padStart(2, '0')}`;
        const m = clean(v).match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
        return m ? `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')}` : '';
    }

    // 王小明 → 王○明；王明 → 王○；歐陽小明 → 歐○○明；英文名 → J***
    function maskName(chinese, english) {
        const c = clean(chinese).replace(/\s+/g, '');
        if (c) return c.length === 1 ? c : c.length === 2 ? c[0] + '○' : c[0] + '○'.repeat(c.length - 2) + c[c.length - 1];
        const e = clean(english);
        return e ? e[0].toUpperCase() + '***' : '(未填姓名)';
    }

    async function hash(text) {
        const buf = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async function makeKey(order, chinese, english, fallback) {
        return normOrder(order) + '|' + await hash(normName(chinese) || normName(english) || ('#' + fallback));
    }

    // 護照到期日距離出發日不足 6 個月 / 已過期
    function passportWarning(expiry, dep) {
        const e = normDate(expiry), d = normDate(dep);
        if (!e || !d) return '';
        const [y, m, day] = d.split('/').map(Number);
        const sixMonths = new Date(y, m - 1 + 6, day);
        const exp = new Date(e);
        if (exp < new Date(d)) return '已過期';
        if (exp < sixMonths) return '不足6個月';
        return '';
    }

    // ===== ① 團體加購紀錄表 (ERP 路徑 d-c，工作表名稱「個團設定加購明細」) =====
    async function parseErp(XLSX, workbook) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, dateNF: 'yyyy/mm/dd' });
        const headerIdx = rows.findIndex(r => r.some(c => clean(c) === '團號') && r.some(c => clean(c) === '訂單編號'));
        if (headerIdx < 0) throw new Error('找不到「團號」「訂單編號」欄位，請確認是 ERP 的「團體加購紀錄表」(d-c)');
        const h = rows[headerIdx];
        const col = {
            group: findCol(h, ['團號']), dep: findCol(h, ['出發日期']), order: findCol(h, ['訂單編號']),
            chinese: findCol(h, ['中文姓名']), english: findCol(h, ['英文姓名']), expiry: findCol(h, ['護照到期']),
            travellerId: findCol(h, ['旅客編號'])
        };
        if (col.dep < 0) throw new Error('找不到「出發日期」欄位');
        const fieldCols = FIELDS.map(f => ({ ...f, col: findCol(h, f.match) }));

        const out = [];
        const groups = new Set();
        const keyCount = {};
        let group = '';
        for (const [i, r] of rows.slice(headerIdx + 1).entries()) {
            if (clean(r[col.group])) group = clean(r[col.group]);
            const dep = normDate(r[col.dep]);
            const order = normOrder(r[col.order]);
            if (!group || !dep || !order || /小計|合計/.test(group)) continue;
            const missing = fieldCols.filter(f => {
                if (f.col < 0) return false;
                const v = clean(r[f.col]);
                return !v || (f.numeric && Number(v) === 0);
            }).map(f => f.label);
            groups.add(group);
            // 同訂單同名 (或都沒填名字) 時加上序號，避免被當成同一人
            let key = await makeKey(order, r[col.chinese], r[col.english], clean(r[col.travellerId]) || ('row' + i));
            keyCount[key] = (keyCount[key] || 0) + 1;
            if (keyCount[key] > 1) key += '#' + keyCount[key];
            out.push({
                key,
                group, dep, order,
                name: maskName(r[col.chinese], r[col.english]),
                missing,
                passport: missing.indexOf('護照效期') >= 0 ? '' : passportWarning(r[col.expiry], dep)
            });
        }
        return { rows: out, groups: groups.size, missingColumns: fieldCols.filter(f => f.col < 0).map(f => f.label) };
    }

    // ===== ② 參團旅客應收明細表 (ERP 路徑 k-z-A，一個工作表一團) =====
    async function parsePayment(XLSX, workbook) {
        const out = [];
        let sheets = 0;
        for (const name of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: true });
            const headerIdx = rows.findIndex(r => r.some(c => clean(c) === '訂單編號') && r.some(c => clean(c) === '旅客姓名'));
            if (headerIdx < 0) continue;
            sheets++;
            const h = rows[headerIdx].map(clean);
            const titleGroup = rows.slice(0, headerIdx).map(r => r.join(' ')).join(' ').match(/團號[:：]\s*([A-Za-z0-9\-]+)/);
            const group = titleGroup ? titleGroup[1] : name;
            const col = { order: h.indexOf('訂單編號'), name: h.indexOf('旅客姓名'), status: h.indexOf('參團狀態'), balance: h.lastIndexOf('應收餘額') };
            let order = '';
            for (const r of rows.slice(headerIdx + 1)) {
                if (r.every(c => clean(c) === '')) break;   // 空白列之後是統計區
                if (clean(r[col.order])) order = normOrder(r[col.order]);
                const person = clean(r[col.name]);
                if (!order || !person) continue;
                const balance = Number(clean(r[col.balance]).replace(/,/g, ''));
                out.push({
                    key: await makeKey(order, person, ''),
                    group, order,
                    status: clean(r[col.status]),
                    paid: isNaN(balance) ? null : balance <= 0
                });
            }
        }
        if (!sheets) throw new Error('找不到「訂單編號」「旅客姓名」欄位，請確認是 ERP 的「參團旅客應收明細表」(k-z-A)');
        return { rows: out, sheets };
    }

    root.TravelerParse = { parseErp, parsePayment, maskName, FIELDS };
})(typeof window !== 'undefined' ? window : globalThis);
