// ============================================================
// CSS Positioning playground — controls → live preview → generated CSS.
//
// One controlled element (#movable) inside a positioning-context stage.
// Modes: Free Play + Challenges. Presets + reset. Vanilla JS.
// ============================================================
(function () {
    'use strict';

    // ---- DOM refs ----
    const movable = document.getElementById('movable');
    const codeEl = document.getElementById('cssCode');
    const copyBtn = document.getElementById('copyCode');
    const resetBtn = document.getElementById('resetBtn');

    const controls = Array.from(document.querySelectorAll('[data-control]'));
    const modeBtns = Array.from(document.querySelectorAll('[data-mode]'));
    const presetBtns = Array.from(document.querySelectorAll('[data-preset]'));

    const cardEl = document.getElementById('challengeCard');
    const progressEl = document.getElementById('challengeProgress');
    const statusEl = document.getElementById('challengeStatus');
    const titleEl = document.getElementById('challengeTitle');
    const goalEl = document.getElementById('challengeGoal');
    const prevBtn = document.getElementById('prevChallenge');
    const nextBtn = document.getElementById('nextChallenge');

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

    // ---- state ----
    let mode = 'free';
    let challengeIndex = 0;
    const solvedSet = new Set();

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

    // ---- apply + generated CSS ----
    function apply() {
        const c = readControls();
        movable.style.position = c.position;
        movable.style.top = toCss(c.top);
        movable.style.right = toCss(c.right);
        movable.style.bottom = toCss(c.bottom);
        movable.style.left = toCss(c.left);
        movable.style.zIndex = c.zIndex;
        renderCode();
        checkChallenge();
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

    // ---- presets / reset ----
    function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        Object.keys(p).forEach(function (prop) { setControl(prop, p[prop]); });
        apply();
    }
    function resetAll() {
        Object.keys(defaults).forEach(function (prop) { setControl(prop, defaults[prop]); });
        apply();
    }

    // ---- challenges ----
    function targetValue(t) {
        const ctrl = controls.find(function (c) { return c.dataset.control === t.prop; });
        return ctrl ? ctrl.value : undefined;
    }
    function isSatisfied(t) {
        const v = targetValue(t);
        return t.test ? t.test(v) : String(v) === String(t.value);
    }
    function checkChallenge() {
        if (mode !== 'challenge') return;
        const ch = CHALLENGES[challengeIndex];
        const remaining = ch.target.filter(function (t) { return !isSatisfied(t); });
        const solved = remaining.length === 0;
        if (solved) solvedSet.add(challengeIndex);
        statusEl.textContent = solved
            ? '✓ Solved!'
            : remaining.length + ' propert' + (remaining.length === 1 ? 'y' : 'ies') + ' to go';
        statusEl.classList.toggle('is-solved', solved);
        cardEl.classList.toggle('is-solved', solved);
        progressEl.textContent =
            'Challenge ' + (challengeIndex + 1) + ' / ' + CHALLENGES.length +
            '  ·  Solved ' + solvedSet.size + '/' + CHALLENGES.length;
    }
    function showChallenge(i) {
        challengeIndex = Math.max(0, Math.min(i, CHALLENGES.length - 1));
        resetAll();
        const ch = CHALLENGES[challengeIndex];
        titleEl.textContent = 'Challenge ' + (challengeIndex + 1) + ': ' + ch.title;
        goalEl.textContent = ch.goal;
        apply();
    }
    function setMode(m) {
        mode = m;
        modeBtns.forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === m); });
        cardEl.hidden = (m !== 'challenge');
        if (m === 'challenge') showChallenge(challengeIndex);
    }

    // ---- events ----
    controls.forEach(function (ctrl) {
        ctrl.addEventListener('change', apply);
        ctrl.addEventListener('input', apply);
    });
    modeBtns.forEach(function (b) {
        b.addEventListener('click', function () { setMode(b.dataset.mode); });
    });
    presetBtns.forEach(function (b) {
        b.addEventListener('click', function () { applyPreset(b.dataset.preset); });
    });
    if (resetBtn) resetBtn.addEventListener('click', resetAll);
    if (prevBtn) prevBtn.addEventListener('click', function () { showChallenge(challengeIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { showChallenge(challengeIndex + 1); });

    // ---- copy button (with file:// fallback) ----
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); }
            finally { document.body.removeChild(ta); }
        });
    }
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            copyText(codeEl.textContent).then(function () {
                const orig = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(function () { copyBtn.textContent = orig; }, 1200);
            });
        });
    }

    // ---- init ----
    apply();
})();
