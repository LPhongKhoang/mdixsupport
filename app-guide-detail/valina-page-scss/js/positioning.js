// ============================================================
// CSS Positioning playground — the playground-specific logic.
// The shared engine (playground.js) handles mode, the challenges card,
// the toolbar, and the copy button. This file supplies the positioning
// config: one controlled element (#movable) inside a positioning stage.
// ============================================================
(function () {
    'use strict';

    // ---- DOM refs ----
    const movable = document.getElementById('movable');
    const codeEl = document.getElementById('cssCode');
    const controls = Array.from(document.querySelectorAll('[data-control]'));

    // ---- defaults (offsets empty = auto) ----
    const defaults = {
        position: 'static',
        top: '',
        right: '',
        bottom: '',
        left: '',
        zIndex: '0',
    };

    // ---- presets ----
    const PRESETS = {
        relative: { position: 'relative', top: '20', left: '20', right: '', bottom: '' },
        pinTL: { position: 'absolute', top: '0', left: '0', right: '', bottom: '' },
        pinBR: { position: 'absolute', bottom: '0', right: '0', top: '', left: '' },
        fill: { position: 'absolute', top: '0', right: '0', bottom: '0', left: '0' },
        sticky: { position: 'sticky', top: '0', right: '', bottom: '', left: '' },
        raise: { position: 'relative', zIndex: '5', top: '', right: '', bottom: '', left: '' },
    };

    // ---- challenges ----
    const CHALLENGES = [
        {
            title: 'Out of the flow',
            goal: 'Pull the blue box out of the normal flow so the gray blocks stack together.',
            target: [{ prop: 'position', value: 'absolute' }],
        },
        {
            title: 'Nudge without leaving',
            goal: 'Keep it in the flow but push it down 20px (use a positioned value that reserves its space).',
            target: [
                { prop: 'position', value: 'relative' },
                { prop: 'top', test: function (v) { return Number(v) >= 20; } },
            ],
        },
        {
            title: 'Pin to the top-left',
            goal: 'Anchor it to the top-left corner of the stage.',
            target: [
                { prop: 'position', value: 'absolute' },
                { prop: 'top', value: '0' },
                { prop: 'left', value: '0' },
            ],
        },
        {
            title: 'Fill the whole box',
            goal: 'Stretch the box to fill the entire stage (all four offsets to 0).',
            target: [
                { prop: 'position', value: 'absolute' },
                { prop: 'top', value: '0' },
                { prop: 'right', value: '0' },
                { prop: 'bottom', value: '0' },
                { prop: 'left', value: '0' },
            ],
        },
        {
            title: 'Raise it above',
            goal: 'Give the box a positive z-index (it must be positioned for z-index to apply).',
            target: [
                { prop: 'position', test: function (v) { return v !== 'static'; } },
                { prop: 'zIndex', test: function (v) { return Number(v) >= 1; } },
            ],
        },
        {
            title: 'Stick on scroll',
            goal: 'Make it stick to the top of the stage when you scroll inside it.',
            target: [
                { prop: 'position', value: 'sticky' },
                { prop: 'top', value: '0' },
            ],
        },
        {
            title: 'Make it fixed',
            goal: 'Switch it to position: fixed (here it stays anchored to the stage).',
            target: [{ prop: 'position', value: 'fixed' }],
        },
        {
            title: 'Pin to the bottom-right',
            goal: 'Anchor it to the bottom-right corner of the stage.',
            target: [
                { prop: 'position', value: 'absolute' },
                { prop: 'bottom', value: '0' },
                { prop: 'right', value: '0' },
            ],
        },
    ];

    // ---- helpers ----
    function readControls() {
        const c = {};
        controls.forEach(function (ctrl) { c[ctrl.dataset.control] = ctrl.value; });
        return c;
    }
    function setControl(prop, value) {
        const ctrl = controls.find(function (c) { return c.dataset.control === prop; });
        if (ctrl) ctrl.value = value;
    }
    // offset value ('' -> auto) to a CSS length
    function toCss(v) {
        return v === '' ? 'auto' : v + 'px';
    }

    // ---- apply + generated CSS (no challenge check — engine does that) ----
    function apply() {
        const c = readControls();
        movable.style.position = c.position;
        movable.style.top = toCss(c.top);
        movable.style.right = toCss(c.right);
        movable.style.bottom = toCss(c.bottom);
        movable.style.left = toCss(c.left);
        movable.style.zIndex = c.zIndex;
        renderCode();
    }
    function renderCode() {
        const c = readControls();
        codeEl.textContent =
            '.movable {\n' +
            '  position: ' + c.position + ';\n' +
            '  top: ' + toCss(c.top) + ';\n' +
            '  right: ' + toCss(c.right) + ';\n' +
            '  bottom: ' + toCss(c.bottom) + ';\n' +
            '  left: ' + toCss(c.left) + ';\n' +
            '  z-index: ' + c.zIndex + ';\n' +
            '}';
    }

    // ---- presets / reset (no challenge check — engine does that) ----
    function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        Object.keys(p).forEach(function (prop) { setControl(prop, p[prop]); });
        apply();
    }
    function resetAll() {
        Object.keys(defaults).forEach(function (prop) { setControl(prop, defaults[prop]); });
    }

    // ---- challenge target resolution ----
    function targetValue(t) {
        const ctrl = controls.find(function (c) { return c.dataset.control === t.prop; });
        return ctrl ? ctrl.value : undefined;
    }
    function isSatisfied(t) {
        const v = targetValue(t);
        return t.test ? t.test(v) : String(v) === String(t.value);
    }

    // ---- wire to the engine ----
    const engine = createPlayground({
        challenges: CHALLENGES,
        isSatisfied: isSatisfied,
        apply: apply,
        reset: resetAll,
        applyPreset: applyPreset,
    });

    // ---- events: controls ----
    controls.forEach(function (ctrl) {
        ctrl.addEventListener('change', function () { apply(); engine.check(); });
        ctrl.addEventListener('input', function () { apply(); engine.check(); });
    });
})();
