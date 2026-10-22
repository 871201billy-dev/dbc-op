# DBC OP 系統

雪宴旅行社 (DBC) 的內部作業工具：人數回報、B2B 同業系統、房控核算。
使用者介面一律用繁體中文；與使用者溝通也用繁體中文。

- 網站：https://871201billy-dev.github.io/dbc-op/ （GitHub Pages，repo `871201billy-dev/dbc-op`，公開）
- 推送到 `main` 約 1 分鐘後網站自動更新

## 架構

純靜態前端 (HTML + 原生 JS)，後端是多支 Google Apps Script (GAS) Web App，資料存在 Google 試算表。

| 檔案 | 用途 |
|---|---|
| `config.js` | GAS 網址 (`GAS_API`)、Google OAuth 用戶端 ID |
| `auth.js` | 放在 `<head>`：未登入導向 login.html、無權限導向第一個可用頁；攔截 fetch 自動附上 `token` |
| `theme.js` | 放在 `<head>`：套用使用者的配色 / 字體大小 (localStorage `opTheme`)，介面設定面板 |
| `common.css` | 共用樣式與配色變數；手機版 (768px 以下) 樣式 |
| `sidebar.js` | 側邊欄 (依權限顯示)、手機版上方標題列與滑出選單 |
| `login.html` / `admin.html` | Google 登入頁 / 帳號管理 (使用者、角色、個人權限) |
| `privacy.html` | 隱私權政策 (Google OAuth 發布需要) |

頁面與權限：`index.html` attendance_query、`attendance.html` attendance_import、`b2b_monitor.html` b2b_monitor、`b2b_settings.html` b2b_settings、`op_room_jp.html` room_jp、`op_room_kr.html` room_kr、`admin.html` admin。新增頁面時要同時改 `auth.js` 的 PAGE_PERMS、`sidebar.js`、登入驗證中心 GAS 的 FEATURES。

## 撰寫慣例

- 顏色一律用 `common.css` 的變數 (`--bg`、`--surface`、`--text`、`--muted`、`--accent` 等)，不要寫死中性色，否則淺色主題會壞掉。狀態色 (#da3633 紅、#3fb950 綠、#d29922 黃) 可直接用。
- 每頁 `<head>` 依序載入 `common.css`、`theme.js`、`auth.js`；`config.js`、`sidebar.js` 放在 body 結尾。
- 呼叫 GAS 用 `fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({...}) })`，auth.js 會自動加 token。

## 登入與權限

1. login.html 用 Google Identity Services 取得 ID token
2. 送到「登入驗證中心」GAS：向 Google 驗證 → 比對試算表「DBC OP 帳號權限」的「使用者」「角色」→ 核發通行證
3. 通行證 = base64(內容) + '.' + HMAC-SHA256 簽章，有效 10 小時
4. 各系統 GAS 用同一把 `AUTH_SECRET` 自行驗證 (`verifyToken`)，回傳 `code: 'AUTH'` 時前端自動登出

**`AUTH_SECRET` 只存在 GAS 程式碼裡 (Google 上與本機 `gas_下載/`)，絕對不可放進這個公開 repo。**
真正的權限把關在 GAS；前端的導向只是畫面。

- Google Cloud 專案「DBC OP 登入」，OAuth 用戶端已授權來源：`https://871201billy-dev.github.io`、`http://localhost:5500`
- 本機測試：在專案資料夾執行 `npx http-server -p 5500 -c-1`，開 http://localhost:5500/login.html (file:// 無法使用 Google 登入)

## GAS 專案

GAS 原始碼不在 repo 裡 (`gas_下載/` 已被 .gitignore 排除，因含金鑰)。用 clasp 取得：`clasp login` 後 `clasp clone <指令碼 ID>`。

| 系統 | 指令碼 ID | 正式部署 ID | 後端權限檢查 |
|---|---|---|---|
| 登入驗證中心 (綁定試算表「DBC OP 帳號權限」) | `1uoRoUtrjW08qOUcwLvu2IDumtcXNuI1EHsUO4uba2rLGu91YqokszNlr` | `AKfycbzkU3mDH6WW6LfT9wUlALln-QDHSJD1tamfarSbcYSF3Um9m7agCrFSqq_Km79iDQQ1` | — |
| 房控 (「房控核算系統 的副本」) | `1wM9G2Hn-u9cVgSXAAOXvfMQpGQf4wL_6K7Vx4lYHX_yG_eSw8sS1-lO_` | `AKfycbwDwl38nPYKjLlC_6dFYVgTOZDu99s2EtrjUvqtfuc8wC677woMD3x3GiSzeTEpchixuQ` | ✅ |
| 房控 原版 (計算邏輯參考，勿改) | `104HQJJVPDtbMBTk8skVr7U02YOEvWNnSt80eghpuHLSmbMZzaZ7RmE4m` | — | — |
| 人數回報「每日人數-claude整合版」(綁定試算表；選單「自動報表」與網站共用 runReport) | `1ros8-g3tMb6RBbAtZuHfcFLSRwrzdtnMnq02-pvPBgqLtnaA2ubLxsq7` | `AKfycbwEvMTsG1Qa7-9guOxwryGNbacOBXZuWskES9WLY7MMB2YkYNXKvTeTYVSEKdOkYln9` | ✅ |
| 人數回報 舊版 (Gemini 改寫，已停用) | 不明 | `AKfycbxXNtscCW2ZDxrVsx6Yti4t5zmkF3MVEQ9TJ9LKthv-Fz-F__vkUGhoREQd_QkD-24KNw` | — |
| B2B (綁定試算表) | 尚未取得 | `AKfycbx6T_sZl5cNVbPZ23cCaH9amZ8N8d-abZl2Zzu5WwKMNcgbioDHzN-Qy_94e8qm0j8M` | ❌ 暫緩 |

更新 GAS：改程式 → `clasp push` → `clasp deploy -i <正式部署 ID> -d "說明"` (部署 ID 不變，網址就不變)。
改動大的話先用新部署測試，確認後再更新正式部署；舊版本可用 `clasp deploy -i <ID> -V <版本號>` 切回。

## 房控計算規則

- 雪場晚數 = 3 + 續滑天數 (標題含「保留市區住宿」的續滑不延長房間)；市區晚數 = 1 + 續住天數；市區入住日 = 雪場退房日
- 團號結構：`s4-j-bt0` = s4 季度 / j 日本 (k 韓國) / b 斑尾 (n 野澤)、t 東京 / 0 不含機票
- 不住市區：團號第三段只有雪場代碼 (如 `s4-j-b0`) 自動判斷；另有 `s4-j-nc`、`s4-j-bc` 客製團
- 野澤團 `s4-j-n*` 不算斑尾雪場房；韓國名單排除 `s4-j`，日本名單排除 `s4-k`
- 韓國線輸出 18 欄 (含庫存剩餘、個團資料)；日本線輸出 11 欄 (一日一列)

## 人數回報規則

- 來源：「總表複製」工作表 (公司系統的團體預計銷售報表)，C 欄團體代碼、H 出發日、I 年、S 確認、T 預訂、U 逾期、W 候補
- 「報表設定」工作表：分類名稱 / 類型 (一般、課程、同業) / 團號前綴 (逗號分隔，支援 `*` 萬用字元；目前用結尾 A = 直客、B = 同業)
- 輸出「yyyy/MM/dd 人數回報」工作表：行程 / 課程 / 同業專案 三區，0 人分類隱藏，月份列依實際報名月份產生
- 計算邏輯在 `computeReport` / `buildGrid` (純函式，可在 Node 用 vm 載入測試)

## 後續計畫

開始做之前，先跟使用者確認下列「待確認」事項，再依現有慣例實作：新頁面放在側邊欄、加入權限 (auth.js PAGE_PERMS、sidebar.js、登入驗證中心 FEATURES)、後端 GAS 要驗證通行證、顏色用配色變數、支援手機版。

### 1. 交接記事 (新功能，2026-10-22 提出)
目的：同事之間交接工作事項的紀錄，讓接手的人知道進度與待辦。
待確認：
- 交接的單位是什麼？(依團號 / 依出發日 / 依人 / 自由記事)
- 需要哪些欄位？(例如：事項、相關團號、負責人、接手人、狀態、期限、附件)
- 是否需要「已讀 / 已處理」標記與提醒？
- 誰可以看、誰可以編輯？(全部人 / 依角色)
- 資料要存在哪份試算表？(新建一份或沿用現有)

### 2. 客戶資料及款項整理 (新功能，2026-10-22 提出)
目的：整理客戶資料與收付款狀況。
待確認：
- 客戶資料來源：公司系統匯出的 Excel？手動輸入？是否與人數回報的「總表」或房控名單相關聯？
- 需要哪些客戶欄位？(姓名、聯絡方式、訂單編號、團號…)；含個資，權限要嚴格 (建議獨立權限，只開放給特定角色)
- 款項整理要做到什麼程度？(應收 / 已收 / 未收、訂金與尾款、收款日期、對帳、逾期提醒、匯出報表)
- 是否需要與 B2B 同業訂單整合？
- 產出格式：網頁表格、匯出 Excel、報表圖片？

### 3. 既有待辦
- B2B：GAS 後端權限檢查暫緩 (需要 B2B 試算表的指令碼 ID)
- 提醒使用者把所有同事加入「帳號管理」
