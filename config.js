// ======== config.js 共用設定 ========
// GAS 重新部署後網址會改變，只要改這裡，所有頁面就會一起更新。

// Google 登入用的 OAuth 用戶端 ID (Google Cloud Console → 憑證)
const GOOGLE_CLIENT_ID = "654480854295-00evlbmljdvkijauqmotn54k68v5n47b.apps.googleusercontent.com";

const GAS_API = {
    // 登入驗證中心 (login.html, admin.html)
    AUTH: "https://script.google.com/macros/s/AKfycbzkU3mDH6WW6LfT9wUlALln-QDHSJD1tamfarSbcYSF3Um9m7agCrFSqq_Km79iDQQ1/exec",

    // 人數回報 (index.html, attendance.html)
    ATTENDANCE: "https://script.google.com/macros/s/AKfycbxXNtscCW2ZDxrVsx6Yti4t5zmkF3MVEQ9TJ9LKthv-Fz-F__vkUGhoREQd_QkD-24KNw/exec",

    // B2B 同業系統 (b2b_monitor.html, b2b_settings.html)
    B2B: "https://script.google.com/macros/s/AKfycbx6T_sZl5cNVbPZ23cCaH9amZ8N8d-abZl2Zzu5WwKMNcgbioDHzN-Qy_94e8qm0j8M/exec",

    // 房控核算系統 (op_room_jp.html, op_room_kr.html)
    ROOM: "https://script.google.com/macros/s/AKfycbwDwl38nPYKjLlC_6dFYVgTOZDu99s2EtrjUvqtfuc8wC677woMD3x3GiSzeTEpchixuQ/exec",

    // 房控 測試版部署 (網址加上 ?test=1 時使用)
    ROOM_TEST: "https://script.google.com/macros/s/AKfycbzSLWLXJgvZy4XZs1LyoXBMuCJbohbA7gKdbeVx5KjjZuV8fDXvbai4IqkauQqgh-sQmQ/exec"
};

// 試用模式：網址加上 ?test=1，改連測試版 GAS，且停用儲存 (測試版與正式版共用同一份資料庫)
const IS_TEST_MODE = new URLSearchParams(location.search).get('test') === '1';

if (IS_TEST_MODE) {
    document.addEventListener("DOMContentLoaded", () => {
        const banner = document.createElement('div');
        banner.textContent = '⚠ 試用模式：使用測試版運算，儲存功能已停用';
        banner.style.cssText = 'position:fixed; top:0; left:0; right:0; z-index:999; background:#d29922; color:#000; text-align:center; padding:6px; font-weight:bold; font-size:0.9rem;';
        document.body.appendChild(banner);
    });
}
