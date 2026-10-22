// ======== sidebar.js 完整版 ========

document.addEventListener("DOMContentLoaded", function() {
    const can = perm => !window.AUTH || AUTH.has(perm);
    const user = window.AUTH && AUTH.user;
    const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // 依權限決定要顯示哪些選單
    const b2bLinks = [
        can('b2b_monitor') ? `<a href="b2b_monitor.html" id="nav-b2b-monitor">訂單監控</a>` : '',
        can('b2b_settings') ? `<a href="b2b_settings.html" id="nav-b2b-settings">系統設定</a>` : ''
    ].join('');
    const roomLinks = [
        can('room_jp') ? `<a href="op_room_jp.html" id="nav-room-jp">日本線配房</a>` : '',
        can('room_kr') ? `<a href="op_room_kr.html" id="nav-room-kr">韓國線配房</a>` : ''
    ].join('');

    // 1. 定義側邊欄的 HTML 結構
    const sidebarHTML = `
        <nav>
            <h2>DBC OP SYSTEM</h2>
            <div class="sidebar-scroll">

                <!-- 首頁、待辦與交接 (所有登入者) -->
                <button class="menu-btn" onclick="location.href='index.html'" id="nav-index">[ 首頁 ]</button>
                ${user ? `<button class="menu-btn" onclick="location.href='todo.html'" id="nav-todo">[ 待辦與交接 ]</button>` : ''}

                <!-- 獨立功能區 -->
                ${can('attendance_import') ? `<button class="menu-btn" onclick="location.href='attendance.html'" id="nav-attendance">[ 人數回報匯入 ]</button>` : ''}

                <!-- B2B 同業系統 (下拉選單) -->
                ${b2bLinks ? `<button class="menu-btn" onclick="toggleSubmenu('b2b-menu')" id="nav-b2b">[ B2B 同業系統 ] ▾</button>
                <div class="submenu" id="b2b-menu">${b2bLinks}</div>` : ''}

                <!-- 房控核算系統 (下拉選單) -->
                ${roomLinks ? `<button class="menu-btn" onclick="toggleSubmenu('room-menu')" id="nav-room">[ 房控核算系統 ] ▾</button>
                <div class="submenu" id="room-menu">${roomLinks}</div>` : ''}

                ${can('traveler_view') ? `<button class="menu-btn" onclick="location.href='traveler.html'" id="nav-traveler">[ 旅客進度表 ]</button>` : ''}

                ${can('admin') && user ? `<button class="menu-btn" onclick="location.href='admin.html'" id="nav-admin">[ 帳號管理 ]</button>` : ''}

            </div>
            <div class="sidebar-bottom">
                ${user ? `<div class="sidebar-user" title="${esc(user.email)}">${esc(user.name)}<small>${esc(user.role)}</small></div>` : ''}
                <button class="menu-btn" onclick="openThemePanel()" id="nav-theme">[ 介面設定 ]</button>
                ${user ? `<button class="menu-btn" onclick="AUTH.logout()" id="nav-logout">[ 登出 ]</button>` : ''}
            </div>
        </nav>
    `;

    // 2. 將 HTML 注入到每個頁面的 <div id="sidebar-container"></div> 中
    const container = document.getElementById("sidebar-container");
    if (container) {
        container.innerHTML = sidebarHTML;

        // 手機版：上方標題列 (☰ 開啟選單) 與半透明遮罩 (點一下關閉)
        const pageTitle = (document.querySelector('main h1') || {}).textContent || 'DBC OP SYSTEM';
        const topbar = document.createElement('div');
        topbar.className = 'mobile-topbar';
        topbar.innerHTML = `<button aria-label="開啟選單" onclick="document.body.classList.add('nav-open')">☰</button><span class="title">${esc(pageTitle.replace(/[\[\]]/g, '').trim())}</span>`;
        const backdrop = document.createElement('div');
        backdrop.className = 'nav-backdrop';
        backdrop.onclick = () => document.body.classList.remove('nav-open');
        container.after(topbar, backdrop);
    }

    // 3. 自動偵測當前網址，高亮對應的按鈕並展開選單
    const currentPath = window.location.pathname.split("/").pop() || 'index.html';

    // 定義每個網頁對應的按鈕 ID 與 選單 ID
    const pathMap = {
        'index.html': { btn: 'nav-index' },
        'attendance.html': { btn: 'nav-attendance' },
        'b2b_monitor.html': { btn: 'nav-b2b', sub: 'nav-b2b-monitor', menu: 'b2b-menu' },
        'b2b_settings.html': { btn: 'nav-b2b', sub: 'nav-b2b-settings', menu: 'b2b-menu' },
        'op_room_jp.html': { btn: 'nav-room', sub: 'nav-room-jp', menu: 'room-menu' },
        'op_room_kr.html': { btn: 'nav-room', sub: 'nav-room-kr', menu: 'room-menu' },
        'admin.html': { btn: 'nav-admin' },
        'todo.html': { btn: 'nav-todo' },
        'traveler.html': { btn: 'nav-traveler' }
    };

    const activeItem = pathMap[currentPath];

    if (activeItem) {
        // 高亮主按鈕 (加上左側青色邊框)
        const mainBtn = document.getElementById(activeItem.btn);
        if (mainBtn) mainBtn.classList.add('active');

        // 如果是下拉選單內的頁面，展開選單並高亮子項目
        if (activeItem.menu) {
            const menuDiv = document.getElementById(activeItem.menu);
            const subLink = document.getElementById(activeItem.sub);
            if (menuDiv) menuDiv.classList.add('show');
            if (subLink) subLink.classList.add('current');
        }
    }
});

// 4. 點擊主按鈕時，展開/收合下拉選單的函數
function toggleSubmenu(id) {
    const submenu = document.getElementById(id);
    if (submenu) {
        submenu.classList.toggle('show');
    }
}
