// DBC OP 工具 - 共用側邊欄組件庫
document.addEventListener("DOMContentLoaded", function() {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) return;

    // 取得目前檔案名稱
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    // 定義選單 HTML 架構
    const sidebarHTML = `
        <nav>
            <h2>DBC OP 工具</h2>
            <div class="sidebar-scroll">
                
                <button class="menu-btn ${currentPage === 'index.html' ? 'active' : ''}" onclick="window.location.href='index.html'">
                    <span>系統總覽</span>
                </button>

                <button class="menu-btn" onclick="toggleSubmenu('menu-b2b')">
                    <span>同業預約系統</span>
                    <span class="arrow">+</span>
                </button>
                <div id="menu-b2b" class="submenu">
                    <a href="b2b_monitor.html" id="link-b2b_monitor">訂單監控與紀錄</a>
                    <a href="b2b_settings.html" id="link-b2b_settings">系統與加購設定</a>
                </div>

                <button class="menu-btn" onclick="toggleSubmenu('menu-op')">
                    <span>房控與車控系統</span>
                    <span class="arrow">+</span>
                </button>
                <div id="menu-op" class="submenu">
                    <a href="#">斑尾高原房控</a>
                    <a href="#">湯澤區房控</a>
                    <a href="#">接駁車派車單</a>
                </div>

                <button class="menu-btn" onclick="toggleSubmenu('menu-report')">
                    <span>報表與分析</span>
                    <span class="arrow">+</span>
                </button>
                <div id="menu-report" class="submenu">
                    <a href="#">回頭客分析</a>
                    <a href="#">營收與成本核算</a>
                </div>

            </div>
        </nav>
    `;

    // 注入選單
    sidebarContainer.innerHTML = sidebarHTML;

    // 自動啟用當前頁面的高亮與展開邏輯
    if (currentPage === "b2b_monitor.html" || currentPage === "b2b_settings.html") {
        const submenu = document.getElementById("menu-b2b");
        if (submenu) {
            submenu.classList.add("show");
            const arrow = submenu.previousElementSibling.querySelector('.arrow');
            if (arrow) arrow.innerText = '-';
        }
        const activeLink = document.getElementById(`link-${currentPage.split('.')[0]}`);
        if (activeLink) activeLink.classList.add("current");
    }
});

// 折疊選單控制邏輯
function toggleSubmenu(menuId) {
    const submenu = document.getElementById(menuId);
    const btn = submenu.previousElementSibling;
    const arrow = btn.querySelector('.arrow');
    
    if (submenu.classList.contains('show')) {
        submenu.classList.remove('show');
        arrow.innerText = '+';
    } else {
        submenu.classList.add('show');
        arrow.innerText = '-';
    }
}