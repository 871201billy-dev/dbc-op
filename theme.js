// ======== theme.js 介面配色設定 ========
// 在 <head> 載入：先套用使用者選的配色，避免頁面閃一下黑色
// 設定只存在各自的瀏覽器 (localStorage)，每位使用者互不影響

(function () {
    const STORE_KEY = 'opTheme';

    const PRESETS = {
        dark: {
            label: '經典深色', scheme: 'dark',
            vars: { bg: '#050505', surface: '#0a0a0a', 'surface-2': '#111111', 'surface-3': '#161b22', 'input-bg': '#000000', border: '#1f1f1f', 'border-strong': '#30363d', text: '#c9d1d9', 'text-strong': '#ffffff', muted: '#8b949e', 'muted-2': '#6e7681', accent: '#00ffcc' }
        },
        soft: {
            label: '柔和深灰', scheme: 'dark',
            vars: { bg: '#1e2228', surface: '#252a31', 'surface-2': '#2d333b', 'surface-3': '#353c45', 'input-bg': '#1b1f24', border: '#3a414b', 'border-strong': '#4a525d', text: '#c9d1d9', 'text-strong': '#e6edf3', muted: '#8b949e', 'muted-2': '#768390', accent: '#4fd1b5' }
        },
        light: {
            label: '明亮淺色', scheme: 'light',
            vars: { bg: '#eef1f5', surface: '#ffffff', 'surface-2': '#f3f5f8', 'surface-3': '#e6ebf1', 'input-bg': '#ffffff', border: '#d0d7de', 'border-strong': '#afb8c1', text: '#24292f', 'text-strong': '#0d1117', muted: '#57606a', 'muted-2': '#6e7781', accent: '#0b7a75' }
        },
        sepia: {
            label: '護眼米色', scheme: 'light',
            vars: { bg: '#efe6d2', surface: '#faf5e8', 'surface-2': '#f1e9d4', 'surface-3': '#e8dcc0', 'input-bg': '#fffbf2', border: '#d8c9a6', 'border-strong': '#c2b18b', text: '#3b3a30', 'text-strong': '#24231c', muted: '#6b6650', 'muted-2': '#857f66', accent: '#2e7d5b' }
        },
    };

    const FONT_SCALES = { small: { label: '小', value: 0.9 }, normal: { label: '標準', value: 1 }, large: { label: '大', value: 1.12 }, xlarge: { label: '特大', value: 1.25 } };
    const DEFAULTS = { preset: 'dark', accent: '', fontScale: 'normal', custom: { bg: '#f4f4f4', surface: '#ffffff', text: '#222222' } };

    function load() {
        try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); }
        catch (e) { return Object.assign({}, DEFAULTS); }
    }
    function save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }

    function luminance(hex) {
        const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const contrastOf = hex => luminance(hex) > 0.35 ? '#000000' : '#ffffff';
    const mix = (a, b, pct) => `color-mix(in srgb, ${a} ${100 - pct}%, ${b} ${pct}%)`;

    // 自訂配色：只選背景、卡片、文字三色，其餘依比例混出來
    function customVars(c) {
        return {
            bg: c.bg, surface: c.surface, 'surface-2': mix(c.surface, c.text, 5), 'surface-3': mix(c.surface, c.text, 10),
            'input-bg': mix(c.bg, c.surface, 50), border: mix(c.surface, c.text, 18), 'border-strong': mix(c.surface, c.text, 30),
            text: c.text, 'text-strong': c.text, muted: mix(c.text, c.surface, 35), 'muted-2': mix(c.text, c.surface, 50), accent: '#0b7a75'
        };
    }

    function apply(s) {
        const isCustom = s.preset === 'custom';
        const vars = isCustom ? customVars(s.custom) : Object.assign({}, (PRESETS[s.preset] || PRESETS.dark).vars);
        const scheme = isCustom ? (luminance(s.custom.bg) > 0.35 ? 'light' : 'dark') : (PRESETS[s.preset] || PRESETS.dark).scheme;
        if (s.accent) vars.accent = s.accent;
        vars['accent-contrast'] = contrastOf(vars.accent);
        vars.shadow = scheme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.08)';
        vars['icon-filter'] = scheme === 'dark' ? 'invert(1)' : 'none';
        vars['font-scale'] = (FONT_SCALES[s.fontScale] || FONT_SCALES.normal).value;

        const root = document.documentElement;
        Object.keys(vars).forEach(k => root.style.setProperty('--' + k, vars[k]));
        root.style.colorScheme = scheme;
    }

    let settings = load();
    apply(settings);

    // ======== 設定面板 ========
    function update(patch) {
        settings = Object.assign({}, settings, patch);
        save(settings);
        apply(settings);
        render();
    }

    function render() {
        const box = document.getElementById('theme-panel');
        if (!box) return;
        const s = settings;
        const cards = Object.keys(PRESETS).map(k => {
            const v = PRESETS[k].vars;
            return `<button class="tp-card ${s.preset === k ? 'on' : ''}" data-preset="${k}" style="background:${v.bg}; color:${v.text}; border-color:${s.preset === k ? 'var(--accent)' : v.border};">
                <span class="tp-swatch" style="background:${v.surface}; border-color:${v.border};"><i style="background:${v.accent}"></i></span>${PRESETS[k].label}</button>`;
        }).join('') + `<button class="tp-card ${s.preset === 'custom' ? 'on' : ''}" data-preset="custom" style="background:${s.custom.bg}; color:${s.custom.text};">
                <span class="tp-swatch" style="background:${s.custom.surface};"><i style="background:${s.accent || '#0b7a75'}"></i></span>自訂</button>`;

        box.innerHTML = `
            <div class="tp-head"><strong>介面設定</strong><button class="tp-close" title="關閉">×</button></div>
            <div class="tp-label">配色主題</div>
            <div class="tp-cards">${cards}</div>
            ${s.preset === 'custom' ? `
            <div class="tp-label">自訂顏色</div>
            <div class="tp-row"><span>背景</span><input type="color" data-custom="bg" value="${s.custom.bg}"></div>
            <div class="tp-row"><span>卡片 / 側邊欄</span><input type="color" data-custom="surface" value="${s.custom.surface}"></div>
            <div class="tp-row"><span>文字</span><input type="color" data-custom="text" value="${s.custom.text}"></div>` : ''}
            <div class="tp-label">強調色（按鈕、標題）</div>
            <div class="tp-row"><span>${s.accent ? '自訂' : '跟隨主題'}</span><span><input type="color" id="tp-accent" value="${s.accent || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ffcc'}">
                ${s.accent ? '<button class="tp-link" id="tp-accent-reset">還原</button>' : ''}</span></div>
            <div class="tp-label">字體大小</div>
            <div class="tp-sizes">${Object.keys(FONT_SCALES).map(k => `<button class="${s.fontScale === k ? 'on' : ''}" data-size="${k}">${FONT_SCALES[k].label}</button>`).join('')}</div>
            <div class="tp-foot"><button class="tp-link" id="tp-reset">全部恢復預設</button><span>只影響這台電腦的這個瀏覽器</span></div>`;

        box.querySelector('.tp-close').onclick = closeThemePanel;
        box.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => update({ preset: b.dataset.preset }));
        box.querySelectorAll('[data-size]').forEach(b => b.onclick = () => update({ fontScale: b.dataset.size }));
        box.querySelectorAll('[data-custom]').forEach(inp => inp.onchange = () => update({ custom: Object.assign({}, settings.custom, { [inp.dataset.custom]: inp.value }) }));
        box.querySelector('#tp-accent').onchange = e => update({ accent: e.target.value });
        const ar = box.querySelector('#tp-accent-reset');
        if (ar) ar.onclick = () => update({ accent: '' });
        box.querySelector('#tp-reset').onclick = () => update(Object.assign({}, DEFAULTS));
    }

    function openThemePanel() {
        if (!document.getElementById('theme-panel')) {
            const style = document.createElement('style');
            style.textContent = `
                #theme-panel { position: fixed; left: 20px; bottom: 20px; z-index: 1000; width: 300px; max-width: calc(100vw - 40px); max-height: calc(100vh / var(--font-scale, 1) - 40px); overflow-y: auto;
                    background: var(--surface); color: var(--text); border: 1px solid var(--border-strong); border-radius: 8px; box-shadow: 0 10px 30px var(--shadow); padding: 16px; font-family: var(--font-main); font-size: 13px; }
                #theme-panel .tp-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: var(--text-strong); font-size: 15px; }
                #theme-panel .tp-close { background: none; border: none; color: var(--muted); font-size: 20px; cursor: pointer; }
                #theme-panel .tp-label { color: var(--muted); margin: 14px 0 6px; }
                #theme-panel .tp-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                #theme-panel .tp-card { display: flex; align-items: center; gap: 8px; padding: 8px; border: 2px solid; border-radius: 6px; cursor: pointer; font: inherit; text-align: left; }
                #theme-panel .tp-card.on { box-shadow: 0 0 0 1px var(--accent); }
                #theme-panel .tp-swatch { width: 22px; height: 22px; border: 1px solid; border-radius: 4px; display: flex; align-items: flex-end; justify-content: flex-end; padding: 2px; flex-shrink: 0; }
                #theme-panel .tp-swatch i { width: 8px; height: 8px; border-radius: 50%; }
                #theme-panel .tp-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                #theme-panel input[type="color"] { width: 44px; height: 28px; border: 1px solid var(--border-strong); border-radius: 4px; background: var(--input-bg); cursor: pointer; padding: 2px; }
                #theme-panel .tp-sizes { display: flex; gap: 6px; }
                #theme-panel .tp-sizes button { flex: 1; padding: 6px 0; background: var(--input-bg); color: var(--text); border: 1px solid var(--border-strong); border-radius: 4px; cursor: pointer; font: inherit; }
                #theme-panel .tp-sizes button.on { background: var(--accent); color: var(--accent-contrast); border-color: var(--accent); }
                #theme-panel .tp-link { background: none; border: none; color: var(--accent); cursor: pointer; font: inherit; padding: 0 4px; text-decoration: underline; }
                #theme-panel .tp-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; color: var(--muted-2); font-size: 12px; gap: 8px; flex-wrap: wrap; }`;
            document.head.appendChild(style);
            const box = document.createElement('div');
            box.id = 'theme-panel';
            document.body.appendChild(box);
        }
        document.getElementById('theme-panel').hidden = false;
        render();
    }

    function closeThemePanel() {
        const box = document.getElementById('theme-panel');
        if (box) box.hidden = true;
    }

    window.openThemePanel = openThemePanel;
    window.closeThemePanel = closeThemePanel;
})();
