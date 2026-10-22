# DBC OP 系統

雪宴旅行社 (DBC) 的內部作業工具 (輔助公司 ERP，不是主系統)：首頁 (交接給我的 + 每日人數查詢)、待辦與工作交接、人數回報匯入、房控核算 (日 / 韓)、旅客進度表、帳號管理；B2B 同業系統暫無需求。
使用者介面一律用繁體中文；與使用者溝通也用繁體中文。

- 網站：https://871201billy-dev.github.io/dbc-op/ （GitHub Pages，repo `871201billy-dev/dbc-op`，公開）
- 推送到 `main` 約 1 分鐘後網站自動更新
- **有改到網頁檔案時，推送前更新 `version.json` 的 version (例如當下時間)**：開著的頁面每 5 分鐘檢查一次，版本不同就提示使用者重新整理 (只改 CLAUDE.md 等文件時不用更新)
- 首頁與待辦頁的交接每分鐘自動檢查新資料 (handover.js refresh)，分頁標題顯示新動態數

## 架構

純靜態前端 (HTML + 原生 JS)，後端是多支 Google Apps Script (GAS) Web App，資料存在 Google 試算表。

| 檔案 | 用途 |
|---|---|
| `config.js` | GAS 網址 (`GAS_API`)、Google OAuth 用戶端 ID |
| `auth.js` | 放在 `<head>`：未登入導向 login.html、無權限導向第一個可用頁；攔截 fetch 自動附上 `token` |
| `theme.js` | 放在 `<head>`：套用使用者的配色 / 字體大小 (localStorage `opTheme`，同時存到帳號，換電腦登入自動套用)，介面設定面板 |
| `common.css` | 共用樣式與配色變數；手機版 (768px 以下) 樣式 |
| `sidebar.js` | 側邊欄 (依權限顯示)、手機版上方標題列與滑出選單 |
| `login.html` / `admin.html` | Google 登入頁 / 帳號管理 (使用者、角色、個人權限) |
| `privacy.html` | 隱私權政策 (Google OAuth 發布需要) |
| `index.html` | **首頁** (所有登入者)：上方「交接給我的」，下方「每日人數查詢」(有 attendance_query 才顯示) |
| `todo.html` | 待辦與交接 (所有登入者)，兩個分頁：<br>• 我的待辦：每人只看得到自己的 (「待辦事項」工作表)。先存瀏覽器 (localStorage `opCache:todoLocal:*`) 再用 `todoBatch` 整批同步，未送出的變更在 `opTodoOutbox:*`，下次開啟自動補送<br>• 工作交接：發給特定同事或「所有人」(ALL)，建立者與對象可回覆進度、標記完成；只有建立者能刪除 (「交接」「交接回覆」工作表) |
| `handover.js` | 工作交接的清單元件，首頁與待辦頁共用；「新」標籤的已讀紀錄存在帳號 (prefs) |
| `traveler.html` / `traveler-parse.js` | 旅客進度表：上傳 ERP 旅客報表 / 尾款表 (瀏覽器內解析、只上傳遮罩姓名與檢查結果)，依出發日 + 地區查詢，勾選合約 / 保險 / 尾款 / 護照、個別備註 |

頁面與權限：`index.html`、`todo.html` 所有登入者 (auth.js OPEN_PAGES)、`attendance.html` attendance_import、`b2b_monitor.html` b2b_monitor、`b2b_settings.html` b2b_settings、`op_room_jp.html` room_jp、`op_room_kr.html` room_kr、`traveler.html` traveler_view (勾選 / 備註需 traveler_check，上傳與分類設定需 traveler_upload)、`admin.html` admin。新增頁面時要同時改 `auth.js` 的 PAGE_PERMS、`sidebar.js`、登入驗證中心 GAS 的 FEATURES。

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
| B2B (綁定試算表；目前無需求，不在計畫中) | 尚未取得 | `AKfycbx6T_sZl5cNVbPZ23cCaH9amZ8N8d-abZl2Zzu5WwKMNcgbioDHzN-Qy_94e8qm0j8M` | — |

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

## 工作交接

- 發給特定同事或「所有人」(ALL)；建立者與對象可回覆進度、標記完成；只有建立者能編輯 (內容 / 對象 / 期限) 與刪除
- 「新」標籤：別人更新過、自己還沒點開看的；已讀紀錄存在帳號 (登入驗證中心「使用者設定」工作表)，換電腦也記得
- 頁面開著時每分鐘自動檢查新交接；有人正在打回覆或編輯時暫停自動更新

## 旅客進度表 (2026-10-22 上線，`traveler.html`、`traveler-parse.js`)
- 權限 traveler_view / traveler_check / traveler_upload (使用者在帳號管理自行分配；管理員角色自動補上)
- 資料在「DBC OP 帳號權限」試算表的「旅客進度」「旅客進度分類」工作表 (登入驗證中心 GAS 的 traveler* action)
- 勾選項目：合約、保險、尾款、護照 (尾款表顯示已清時自動勾選)；每位旅客可寫備註；尾款只存清 / 未清，不存金額
- 解析在瀏覽器內完成 (`traveler-parse.js`，可在 Node 用 vm 載入測試)；ERP 的 .xls 訂單編號前會夾帶控制字元，已在 clean() 去除
- ERP (科威) 報表名稱與下載路徑：① **團體加購紀錄表** (科威路徑 D-C-團體加購紀錄表，檔案內工作表名稱「個團設定加購明細」)；② **參團旅客應收明細表** (科威路徑 K-Z-A.參團旅客應收明細表，範圍大時分段下載、分次上傳)
- 可拖曳上傳、一次多檔，依標題自動判斷是哪一份報表；ERP 報表可分段上傳 (只比對該次涵蓋的出發日範圍)
- 前端一次載入全部旅客 (`travelerList` date=ALL) 存在瀏覽器，切換日期 / 地區在本機篩選

設計決定 (皆已與使用者確認)：
- **個資最小化**：Excel 在瀏覽器內解析，雲端只存團號、出發日、訂單編號、遮罩姓名 (王○明)、缺漏欄位名稱、護照效期警示、尾款清 / 未清、勾選與備註。不存身分證、手機、Email、護照號碼、金額
- **唯一鍵** = 訂單編號 (去開頭 0) + '|' + 姓名 SHA-256 前 16 碼；同訂單同名或沒名字時用旅客編號 / 序號區分。兩份報表用同樣方式算 key 才能合併
- **完整度檢查欄位**：英文姓名、手機、Email、身分證、生日、護照號碼、護照效期 (+ 不足 6 個月 / 已過期警示)、身高、體重、腳長 (數值 0 視為缺)、LEVEL、滑雪類別、分房
- **顯示**：依出發日 + 地區 (野澤 / 斑尾 / 龍平 / 湯澤 / 其他) 查詢；依訂單分組，訂單編號在前；每位旅客標示團型 (不含機票 / 含機票 / 客製 / 不住市區 / 純課程)
- **分類**：「旅客進度分類」工作表 (地區 / 團型 / 團號前綴，支援 *)，頁面上「行程分類設定」可修改
- **取消**：尾款表參團狀態「取消」、或在 ERP 報表涵蓋範圍內卻消失的旅客 → 灰色標示，不列入統計，勾選與備註保留
- **團體加購紀錄表結構**：工作表「個團設定加購明細」，第 2 列為欄位名稱；團號只填在每團第一列，往下沿用；略過「數量小計」
- **參團旅客應收明細表結構**：一個工作表一團；第 7 列為欄位名稱；每張訂單第一列有訂單編號 (往下沿用)；旅客層級「應收餘額」用最後一個同名欄位，≤ 0 為「清」；空白列之後是統計區

## 待辦與提醒

- 提醒使用者：把所有同事加入「帳號管理」，並把旅客進度的三個權限分配給需要的角色
- 專案資料夾裡的 ERP 原始 Excel 含完整個資，不會進 git (.gitignore 已排除 *.xls / *.xlsx / *.csv / 資料/)，但會同步到 OneDrive，用完建議刪除
- 交接之後可能的延伸：依團號關聯、附件

## 不在計畫中
- B2B 同業系統：當初為了洽談中的廠商而做，目前沒有需求。頁面維持現狀，不需修改、優化或加後端權限檢查，除非使用者主動提出。
