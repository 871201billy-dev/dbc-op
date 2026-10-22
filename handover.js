// ======== handover.js 工作交接 (首頁、待辦與交接頁共用) ========
// 用法：Handover.mount(容器, { filter }) 掛上清單；Handover.create({...}) 新增；資料由 Handover.load() 讀取
// filter：'incoming' 交接給我的、'outgoing' 我發出的、'done' 已完成；open: true 只顯示進行中
// 畫面先更新，背景依序同步到「登入驗證中心」GAS (handover* action)

(function () {
    const me = AUTH.user.email;
    const SEEN_KEY = 'opHandoverSeen:' + me;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const newId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const pad = n => String(n).padStart(2, '0');
    const now = () => { const d = new Date(); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const today = () => now().slice(0, 10);

    let items = [];
    let users = [];
    let loaded = false;
    let pending = 0;
    let queue = Promise.resolve();
    const views = [];
    const expanded = new Set();
    const listeners = [];

    // ===== 已讀紀錄 (存在自己的瀏覽器)：別人更新過、我還沒展開看過的，標示「新」 =====
    function loadSeen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch (e) { return {}; } }
    function markSeen(h) {
        const seen = loadSeen();
        seen[h.id] = h.updated || now();
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}
    }
    function lastActor(h) { return h.replies.length ? h.replies[h.replies.length - 1].email : h.from; }
    function isNew(h) {
        if (lastActor(h) === me) return false;
        const seen = loadSeen()[h.id];
        return !seen || seen < h.updated;
    }

    const isIncoming = h => h.from !== me && (h.targets.indexOf('ALL') >= 0 || h.targets.indexOf(me) >= 0);
    const isOutgoing = h => h.from === me;
    const nameOf = email => (users.find(u => u.email === email) || {}).name || email;
    const targetLabel = h => h.targets.indexOf('ALL') >= 0 ? '所有人' : h.targets.map(nameOf).join('、');

    // ===== 讀取 =====
    function load() {
        fetchWithCache(GAS_API.AUTH, { action: 'userDirectory' }, res => { if (res.status === 'success') { users = res.users; renderAll(); } }).catch(() => {});
        return fetchWithCache(GAS_API.AUTH, { action: 'handoverList' }, res => {
            if (res.status !== 'success') { setStatus('交接讀取失敗：' + res.message); return; }
            if (pending === 0) { items = res.items; loaded = true; renderAll(); }
        }).catch(err => setStatus('網路錯誤：' + err.message));
    }

    // ===== 寫入：一次送一筆，回應後用伺服器的最新資料重畫 =====
    function sync(body) {
        pending++;
        setStatus('✓ 已送出 · 同步中…');
        queue = queue.then(() => fetch(GAS_API.AUTH, { method: 'POST', body: JSON.stringify(body) })
            .then(r => r.json())
            .then(res => {
                if (res.status !== 'success') { setStatus('同步失敗：' + res.message); return; }
                if (pending === 1) { items = res.items; renderAll(); setStatus('✓ 已送出 · 已同步'); }
            })
            .catch(err => setStatus('網路錯誤，有變更沒有存到：' + err.message))
            .then(() => { pending--; }));
        return queue;
    }
    window.addEventListener('beforeunload', e => { if (pending > 0) { e.preventDefault(); e.returnValue = ''; } });

    function setStatus(text) { views.forEach(v => { if (v.statusEl) v.statusEl.textContent = text; }); }

    // ===== 操作 =====
    function create(data) {
        const item = { id: newId(), from: me, fromName: AUTH.user.name, text: data.text, targets: data.targets, due: data.due || '', status: 'open', created: now(), updated: now(), replies: [] };
        items.unshift(item);
        renderAll();
        return sync({ action: 'handoverSave', item: { id: item.id, text: item.text, targets: item.targets, due: item.due } });
    }

    function reply(id, text) {
        const h = items.find(x => x.id === id);
        h.replies.push({ id: newId(), email: me, name: AUTH.user.name, text, time: now() });
        h.updated = now();
        renderAll();
        sync({ action: 'handoverReply', id, text });
    }

    function setStatusOf(id, status) {
        const h = items.find(x => x.id === id);
        h.status = status;
        h.replies.push({ id: newId(), email: me, name: AUTH.user.name, text: status === 'done' ? '✔ 已標記為完成' : '↺ 重新開啟', time: now() });
        renderAll();
        sync({ action: 'handoverStatus', id, status });
    }

    function remove(id, btn) {
        if (!btn.dataset.confirm) { btn.dataset.confirm = '1'; btn.textContent = '確定刪除？'; return; }
        items = items.filter(x => x.id !== id);
        renderAll();
        sync({ action: 'handoverDelete', id });
    }

    function toggle(id) {
        const h = items.find(x => x.id === id);
        if (expanded.has(id)) expanded.delete(id);
        else { expanded.add(id); markSeen(h); }
        renderAll();
        if (expanded.has(id)) {
            const box = document.querySelector(`[data-ho="${id}"] textarea`);
            if (box) box.focus({ preventScroll: true });
        }
    }

    // ===== 畫面 =====
    function dueBadge(h) {
        if (!h.due) return '';
        const cls = h.status === 'done' ? '' : (h.due < today() ? 'overdue' : (h.due === today() ? 'today' : ''));
        return `<span class="ho-due ${cls}" title="期限 ${h.due}">${h.due === today() ? '今天' : h.due.slice(5)}</span>`;
    }

    function cardHtml(h) {
        const open = expanded.has(h.id);
        const last = h.replies[h.replies.length - 1];
        const mine = h.from === me;
        return `<div class="ho-card ${h.status === 'done' ? 'done' : ''} ${open ? 'open' : ''}" data-ho="${h.id}">
            <div class="ho-head" onclick="Handover.toggle('${h.id}')">
                <span class="ho-people"><b>${esc(h.fromName || h.from)}</b> → ${esc(targetLabel(h))}</span>
                ${isNew(h) ? '<span class="ho-new">新</span>' : ''}
                ${dueBadge(h)}
                ${h.status === 'done' ? '<span class="ho-state">已完成</span>' : ''}
                <span class="ho-time">${esc(h.updated)}</span>
            </div>
            <div class="ho-text" onclick="Handover.toggle('${h.id}')">${esc(h.text)}</div>
            ${open ? `
                <div class="ho-replies">
                    ${h.replies.map(r => `<div class="ho-reply ${/^[✔↺]/.test(r.text) ? 'system' : ''}"><b>${esc(r.name || r.email)}</b><span>${esc(r.text)}</span><time>${esc(r.time.slice(5))}</time></div>`).join('') || '<div class="ho-empty">還沒有人回覆</div>'}
                </div>
                <div class="ho-reply-box">
                    <textarea rows="2" maxlength="1000" placeholder="回覆交接進度… (Ctrl + Enter 送出)"></textarea>
                    <button class="ho-btn primary" onclick="Handover.sendReply('${h.id}')">回覆</button>
                </div>
                <div class="ho-actions">
                    ${h.status === 'done'
                        ? `<button class="ho-btn" onclick="Handover.setStatus('${h.id}', 'open')">↺ 重新開啟</button>`
                        : `<button class="ho-btn ok" onclick="Handover.setStatus('${h.id}', 'done')">✔ 標記完成</button>`}
                    ${mine ? `<button class="ho-btn danger" onclick="Handover.remove('${h.id}', this)">刪除</button>` : ''}
                </div>`
            : `<div class="ho-foot" onclick="Handover.toggle('${h.id}')">${h.replies.length ? `💬 ${h.replies.length} 則回覆　最新：${esc(last.name)}：${esc(last.text.slice(0, 40))}` : '點開回覆進度'}</div>`}
        </div>`;
    }

    function filtered(v) {
        let list = items.filter(h => v.filter === 'incoming' ? isIncoming(h) : v.filter === 'outgoing' ? isOutgoing(h) : true);
        if (v.filter === 'done') list = list.filter(h => h.status === 'done');
        else if (v.open) list = list.filter(h => h.status !== 'done');
        // 進行中在前；有新動態的排前面；再依最後更新時間
        return list.sort((a, b) => (a.status === 'done') - (b.status === 'done') || isNew(b) - isNew(a) || (b.updated > a.updated ? 1 : -1));
    }

    function renderView(v) {
        if (!loaded) { v.el.innerHTML = '<div class="ho-empty">讀取中...</div>'; return; }
        const list = filtered(v);
        v.el.innerHTML = list.length ? list.map(cardHtml).join('') : `<div class="ho-empty">${v.emptyText || '目前沒有交接事項'}</div>`;
        // 保留回覆框中尚未送出的文字
        v.el.querySelectorAll('textarea').forEach(t => {
            const id = t.closest('[data-ho]').dataset.ho;
            if (drafts[id]) t.value = drafts[id];
            t.addEventListener('input', () => { drafts[id] = t.value; });
            t.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) Handover.sendReply(id); });
        });
    }
    const drafts = {};

    function renderAll() {
        views.forEach(renderView);
        listeners.forEach(fn => fn(items));
    }

    function sendReply(id) {
        const text = (drafts[id] || '').trim();
        if (!text) return;
        drafts[id] = '';
        reply(id, text);
    }

    // ===== 共用樣式 =====
    const style = document.createElement('style');
    style.textContent = `
        .ho-card { border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 4px; background: var(--bg); margin-bottom: 10px; padding: 12px 14px; transition: 0.2s; }
        .ho-card:hover { border-color: var(--border-strong); border-left-color: var(--accent); }
        .ho-card.done { border-left-color: var(--border-strong); opacity: 0.75; }
        .ho-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; cursor: pointer; font-size: 0.82rem; color: var(--muted); }
        .ho-people b { color: var(--text-strong); font-weight: 600; }
        .ho-time { margin-left: auto; font-family: var(--font-mono); font-size: 0.75rem; color: var(--muted-2); }
        .ho-new { background: #da3633; color: #fff; font-size: 0.7rem; font-weight: bold; padding: 1px 7px; border-radius: 9px; }
        .ho-state { background: var(--surface-3); color: var(--muted); font-size: 0.72rem; padding: 1px 8px; border-radius: 9px; }
        .ho-due { font-family: var(--font-mono); font-size: 0.75rem; padding: 1px 8px; border-radius: 9px; background: var(--surface-3); color: var(--muted); }
        .ho-due.today { background: rgba(210,153,34,0.18); color: #d29922; }
        .ho-due.overdue { background: rgba(218,54,51,0.18); color: #da3633; }
        .ho-text { margin: 8px 0 6px; color: var(--text-strong); font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; cursor: pointer; }
        .ho-card:not(.open) .ho-text { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .ho-foot { font-size: 0.8rem; color: var(--muted); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ho-replies { border-top: 1px dashed var(--border); margin-top: 8px; padding-top: 8px; }
        .ho-reply { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: baseline; padding: 5px 0; font-size: 0.86rem; color: var(--text); }
        .ho-reply b { color: var(--accent); font-weight: 600; white-space: nowrap; }
        .ho-reply span { white-space: pre-wrap; overflow-wrap: anywhere; }
        .ho-reply time { font-family: var(--font-mono); font-size: 0.72rem; color: var(--muted-2); white-space: nowrap; }
        .ho-reply.system span { color: var(--muted); font-style: italic; }
        .ho-reply-box { display: flex; gap: 8px; margin-top: 10px; align-items: flex-end; }
        .ho-reply-box textarea { flex: 1; min-width: 0; resize: vertical; padding: 8px 10px; background: var(--input-bg); border: 1px solid var(--border-strong); color: var(--text-strong); border-radius: 4px; font: inherit; font-size: 0.9rem; outline: none; }
        .ho-reply-box textarea:focus { border-color: var(--accent); }
        .ho-actions { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
        .ho-btn { background: transparent; border: 1px solid var(--border-strong); color: var(--muted); padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 0.82rem; font-family: var(--font-main); transition: 0.2s; white-space: nowrap; }
        .ho-btn:hover { color: var(--text-strong); border-color: var(--muted); }
        .ho-btn.primary { border-color: var(--accent); color: var(--accent); }
        .ho-btn.primary:hover { background: var(--accent); color: var(--accent-contrast); }
        .ho-btn.ok { border-color: #3fb950; color: #3fb950; }
        .ho-btn.ok:hover { background: #3fb950; color: #000; }
        .ho-btn.danger { border-color: #da3633; color: #da3633; }
        .ho-btn.danger:hover { background: #da3633; color: #fff; }
        .ho-empty { color: var(--muted); font-size: 0.88rem; padding: 18px 0; text-align: center; }
        @media (max-width: 768px) { .ho-time { margin-left: 0; width: 100%; } }`;
    document.head.appendChild(style);

    window.Handover = {
        load, create, toggle, sendReply, remove,
        setStatus: setStatusOf,
        users: () => users.filter(u => u.email !== me),
        items: () => items,
        isNew, isIncoming,
        onChange: fn => listeners.push(fn),
        mount(el, options) {
            const v = Object.assign({ el, filter: 'incoming', open: false }, options);
            views.push(v);
            renderView(v);
            return {
                setFilter(filter, open, emptyText) { v.filter = filter; v.open = !!open; if (emptyText) v.emptyText = emptyText; renderView(v); }
            };
        }
    };
})();
