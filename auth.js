// ======== auth.js 登入與權限檢查 ========
// 在 <head> 載入：沒登入就轉到登入頁；沒有這頁的權限就轉到第一個有權限的頁面
// 呼叫 GAS 時自動附上通行證 (token)，GAS 回報過期就登出
// 注意：真正的權限把關在各 GAS，這裡只負責畫面導向

(function () {
    const STORE_KEY = 'opAuth';

    // 頁面 → 需要的權限 (順序即登入後預設前往的順序)
    const PAGE_PERMS = {
        'index.html': 'attendance_query',
        'attendance.html': 'attendance_import',
        'b2b_monitor.html': 'b2b_monitor',
        'b2b_settings.html': 'b2b_settings',
        'op_room_jp.html': 'room_jp',
        'op_room_kr.html': 'room_kr',
        'admin.html': 'admin'
    };

    function load() {
        try {
            const a = JSON.parse(localStorage.getItem(STORE_KEY));
            return a && a.token && a.exp > Date.now() ? a : null;
        } catch (e) { return null; }
    }

    const auth = load();
    const page = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';

    window.AUTH = {
        user: auth ? auth.user : null,
        token: auth ? auth.token : null,
        pagePerms: PAGE_PERMS,
        has: perm => !!(auth && auth.user.perms.indexOf(perm) >= 0),
        firstAllowedPage: () => Object.keys(PAGE_PERMS).find(p => auth && auth.user.perms.indexOf(PAGE_PERMS[p]) >= 0),
        save: data => { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {} },
        logout: reason => {
            try { localStorage.removeItem(STORE_KEY); } catch (e) {}
            location.replace('login.html' + (reason ? '?reason=' + reason : ''));
        }
    };

    if (page === 'login.html') return;

    function redirect(url) {
        document.documentElement.style.visibility = 'hidden';
        location.replace(url);
    }

    if (!auth) {
        const next = page + location.search;
        redirect('login.html?next=' + encodeURIComponent(next));
        return;
    }

    const need = PAGE_PERMS[page];
    if (need && !AUTH.has(need)) {
        const first = AUTH.firstAllowedPage();
        redirect(first ? first : 'login.html?reason=denied');
        return;
    }

    // 呼叫 GAS 時自動附上通行證
    const originalFetch = window.fetch.bind(window);
    window.fetch = function (url, options) {
        if (typeof url === 'string' && url.indexOf('https://script.google.com/') === 0 && options && typeof options.body === 'string') {
            try {
                const body = JSON.parse(options.body);
                body.token = auth.token;
                options = Object.assign({}, options, { body: JSON.stringify(body) });
            } catch (e) { /* 不是 JSON 就照原樣送出 */ }
        }
        return originalFetch(url, options).then(res => {
            res.clone().json().then(j => { if (j && j.code === 'AUTH') AUTH.logout('expired'); }).catch(() => {});
            return res;
        });
    };

    // 通行證到期時自動登出
    setTimeout(() => AUTH.logout('expired'), Math.max(0, auth.exp - Date.now()));
})();
