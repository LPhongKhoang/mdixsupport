// ============================================================
// CSS Grid playground — controls → live preview → generated CSS.
//
// Modes:
//   • Free Play    — pure sandbox
//   • Challenges   — 8 guided levels with live pass/fail feedback
//
// Plus one-click layout presets and a full reset.
// Vanilla JS, no dependencies. Mirrors the flex playground's design.
// ============================================================
(function () {
    'use strict';

    // ---- DOM refs ----
    const preview = document.getElementById('gridPreview');
    const codeEl = document.getElementById('cssCode');
    const countEl = document.getElementById('itemCount');
    const selectedLabel = document.getElementById('selectedLabel');
    const copyBtn = document.getElementById('copyCode');
    const addBtn = document.getElementById('addItem');
    const removeBtn = document.getElementById('removeItem');
    const resetBtn = document.getElementById('resetBtn');

    const containerControls = Array.from(document.querySelectorAll('[data-container]'));
    const itemControls = Array.from(document.querySelectorAll('[data-item]'));
    const valueSpans = Array.from(document.querySelectorAll('[data-for]'));
    const modeBtns = Array.from(document.querySelectorAll('[data-mode]'));
    const presetBtns = Array.from(document.querySelectorAll('[data-preset]'));

    // challenge-card refs
    const cardEl = document.getElementById('challengeCard');
    const progressEl = document.getElementById('challengeProgress');
    const statusEl = document.getElementById('challengeStatus');
    const titleEl = document.getElementById('challengeTitle');
    const goalEl = document.getElementById('challengeGoal');
    const prevBtn = document.getElementById('prevChallenge');
    const nextBtn = document.getElementById('nextChallenge');

    // ---- defaults ----
    const DEFAULT_ITEM_COUNT = 6;
    const containerDefaults = {
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'auto',
        gap: '12',
        justifyItems: 'stretch',
        alignItems: 'stretch',
        justifyContent: 'start',
        alignContent: 'start',
        gridAutoFlow: 'row',
    };
    const itemDefaults = {
        gridColumn: 'auto',
        gridRow: 'auto',
        justifySelf: 'auto',
        alignSelf: 'auto',
    };

    const palette = [
        '#3498db', '#9b59b6', '#e67e22', '#1abc9c',
        '#e74c3c', '#f1c40f', '#2ecc71', '#34495e',
        '#16a085', '#8e44ad', '#d35400', '#27ae60',
    ];

    // ---- presets (container-only quick layouts) ----
    const PRESETS = {
        cols2: { gridTemplateColumns: 'repeat(2, 1fr)' },
        cols3: { gridTemplateColumns: 'repeat(3, 1fr)' },
        cols4: { gridTemplateColumns: 'repeat(4, 1fr)' },
        sidebar: { gridTemplateColumns: '200px 1fr' },
        cards: { gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16' },
        centered: { justifyItems: 'center', alignItems: 'center' },
    };

    // ---- challenges ----
    const CHALLENGES = [
        {
            title: 'Two columns',
            goal: 'Lay the items out in exactly 2 equal columns.',
            target: [{ prop: 'gridTemplateColumns', value: 'repeat(2, 1fr)' }],
        },
        {
            title: 'Three columns',
            goal: 'Arrange the items in 3 equal columns.',
            target: [{ prop: 'gridTemplateColumns', value: 'repeat(3, 1fr)' }],
        },
        {
            title: 'Add gaps',
            goal: 'Set a gap of at least 16px between the tracks.',
            target: [{ prop: 'gap', test: function (v) { return Number(v) >= 16; } }],
        },
        {
            title: 'Center in cells',
            goal: 'Center each item inside its cell, both horizontally and vertically.',
            target: [
                { prop: 'justifyItems', value: 'center' },
                { prop: 'alignItems', value: 'center' },
            ],
        },
        {
            title: 'Span the first',
            goal: 'Select item #1 and make it span more than one column.',
            target: [{ type: 'item', item: 0, prop: 'gridColumn', test: function (v) { return String(v) !== 'auto' && String(v) !== ''; } }],
        },
        {
            title: 'Sidebar layout',
            goal: 'Create a fixed sidebar (200px) next to a flexible main area.',
            target: [{ prop: 'gridTemplateColumns', value: '200px 1fr' }],
        },
        {
            title: 'Responsive cards',
            goal: 'Make the columns auto-fit so the cards wrap responsively.',
            target: [{ prop: 'gridTemplateColumns', value: 'repeat(auto-fit, minmax(120px, 1fr))' }],
        },
        {
            title: 'Fill extra space',
            goal: 'Distribute extra horizontal space: spread tracks to the edges.',
            target: [{ prop: 'justifyContent', value: 'space-between' }],
        },
    ];

    // ---- state ----
    let itemCount = DEFAULT_ITEM_COUNT;
    let selectedIndex = null;
    const itemStyles = {};
    let mode = 'free';
    let challengeIndex = 0;
    const solvedSet = new Set();

    // ---- helpers ----
    function readContainer() {
        const c = {};
        containerControls.forEach(function (ctrl) { c[ctrl.dataset.container] = ctrl.value; });
        return c;
    }
    function getItemStyle(i) { return itemStyles[i] || Object.assign({}, itemDefaults); }
    function setItemStyle(i, prop, val) {
        if (!itemStyles[i]) itemStyles[i] = Object.assign({}, itemDefaults);
        itemStyles[i][prop] = val;
    }
    function setContainerControl(prop, value) {
        const ctrl = containerControls.find(function (c) { return c.dataset.container === prop; });
        if (ctrl) ctrl.value = value;
    }
    function updateValueSpans() {
        valueSpans.forEach(function (span) {
            const key = span.dataset.for;
            const ctrl =
                containerControls.find(function (c) { return c.dataset.container === key; }) ||
                itemControls.find(function (c) { return c.dataset.item === key; });
            if (!ctrl) return;
            let v = ctrl.value;
            if (key === 'gap') v += 'px';
            span.textContent = v;
        });
    }

    // ---- preview rendering ----
    function buildItems() {
        preview.innerHTML = '';
        for (let i = 0; i < itemCount; i++) {
            const box = document.createElement('div');
            box.className = 'grid-item';
            box.textContent = String(i + 1);
            box.dataset.index = String(i);
            box.style.backgroundColor = palette[i % palette.length];
            box.addEventListener('click', function () { selectItem(i); });
            preview.appendChild(box);
        }
        if (selectedIndex !== null && selectedIndex >= itemCount) selectedIndex = null;
        paintItems();
    }
    function paintItems() {
        Array.from(preview.children).forEach(function (box, i) {
            const s = getItemStyle(i);
            box.style.gridColumn = s.gridColumn;
            box.style.gridRow = s.gridRow;
            box.style.justifySelf = s.justifySelf;
            box.style.alignSelf = s.alignSelf;
            box.classList.toggle('is-selected', i === selectedIndex);
        });
    }
    function selectItem(i) {
        selectedIndex = i;
        paintItems();
        syncItemControls();
        renderCode();
        checkChallenge();
    }
    function syncItemControls() {
        if (selectedIndex === null) {
            selectedLabel.textContent = 'None selected — click a box below to edit its item properties.';
            itemControls.forEach(function (c) { c.value = itemDefaults[c.dataset.item]; });
        } else {
            const s = getItemStyle(selectedIndex);
            selectedLabel.textContent = 'Editing item #' + (selectedIndex + 1);
            itemControls.forEach(function (c) { c.value = s[c.dataset.item]; });
        }
        updateValueSpans();
    }

    // ---- container application + generated CSS ----
    function applyContainer() {
        const c = readContainer();
        preview.style.gridTemplateColumns = c.gridTemplateColumns;
        preview.style.gridTemplateRows = c.gridTemplateRows;
        preview.style.gap = c.gap + 'px';
        preview.style.justifyItems = c.justifyItems;
        preview.style.alignItems = c.alignItems;
        preview.style.justifyContent = c.justifyContent;
        preview.style.alignContent = c.alignContent;
        preview.style.gridAutoFlow = c.gridAutoFlow;
        renderCode();
        checkChallenge();
    }
    function renderCode() {
        const c = readContainer();
        let css =
            '.container {\n' +
            '  display: grid;\n' +
            '  grid-template-columns: ' + c.gridTemplateColumns + ';\n' +
            '  grid-template-rows: ' + c.gridTemplateRows + ';\n' +
            '  gap: ' + c.gap + 'px;\n' +
            '  justify-items: ' + c.justifyItems + ';\n' +
            '  align-items: ' + c.alignItems + ';\n' +
            '  justify-content: ' + c.justifyContent + ';\n' +
            '  align-content: ' + c.alignContent + ';\n' +
            '  grid-auto-flow: ' + c.gridAutoFlow + ';\n' +
            '}';
        if (selectedIndex !== null) {
            const s = getItemStyle(selectedIndex);
            css +=
                '\n\n.item-' + (selectedIndex + 1) + ' {\n' +
                '  grid-column: ' + s.gridColumn + ';\n' +
                '  grid-row: ' + s.gridRow + ';\n' +
                '  justify-self: ' + s.justifySelf + ';\n' +
                '  align-self: ' + s.alignSelf + ';\n' +
                '}';
        }
        codeEl.textContent = css;
    }

    // ---- presets ----
    function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        Object.keys(p).forEach(function (prop) { setContainerControl(prop, p[prop]); });
        updateValueSpans();
        applyContainer();
    }

    // ---- reset ----
    function resetAll() {
        Object.keys(containerDefaults).forEach(function (prop) {
            setContainerControl(prop, containerDefaults[prop]);
        });
        itemCount = DEFAULT_ITEM_COUNT;
        countEl.textContent = String(itemCount);
        Object.keys(itemStyles).forEach(function (k) { delete itemStyles[k]; });
        selectedIndex = null;
        buildItems();
        syncItemControls();
        updateValueSpans();
        applyContainer();
    }

    // ---- challenges ----
    function targetValue(t) {
        if (t.type === 'item') {
            return getItemStyle(t.item)[t.prop];
        }
        const ctrl = containerControls.find(function (c) { return c.dataset.container === t.prop; });
        return ctrl ? ctrl.value : undefined;
    }
    function isTargetSatisfied(t) {
        const v = targetValue(t);
        return t.test ? t.test(v) : String(v) === String(t.value);
    }
    function checkChallenge() {
        if (mode !== 'challenge') return;
        const ch = CHALLENGES[challengeIndex];
        const remaining = ch.target.filter(function (t) { return !isTargetSatisfied(t); });
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
        applyContainer();
    }
    function setMode(m) {
        mode = m;
        modeBtns.forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === m); });
        cardEl.hidden = (m !== 'challenge');
        if (m === 'challenge') showChallenge(challengeIndex);
    }

    // ---- events: container controls ----
    containerControls.forEach(function (ctrl) {
        ctrl.addEventListener('change', function () { updateValueSpans(); applyContainer(); });
        ctrl.addEventListener('input', function () { updateValueSpans(); applyContainer(); });
    });

    // ---- events: item controls ----
    itemControls.forEach(function (ctrl) {
        const handler = function () {
            if (selectedIndex === null) return;
            setItemStyle(selectedIndex, ctrl.dataset.item, ctrl.value);
            paintItems();
            updateValueSpans();
            renderCode();
            checkChallenge();
        };
        ctrl.addEventListener('change', handler);
        ctrl.addEventListener('input', handler);
    });

    // ---- events: item count ----
    addBtn.addEventListener('click', function () {
        if (itemCount < 12) {
            itemCount++;
            countEl.textContent = String(itemCount);
            buildItems();
            checkChallenge();
        }
    });
    removeBtn.addEventListener('click', function () {
        if (itemCount > 1) {
            itemCount--;
            if (selectedIndex !== null && selectedIndex >= itemCount) selectedIndex = null;
            countEl.textContent = String(itemCount);
            buildItems();
            syncItemControls();
            checkChallenge();
        }
    });

    // ---- events: toolbar ----
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
    countEl.textContent = String(itemCount);
    buildItems();
    syncItemControls();
    updateValueSpans();
    applyContainer();
})();
