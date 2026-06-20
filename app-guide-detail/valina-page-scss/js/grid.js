// ============================================================
// CSS Grid playground — the playground-specific logic.
// The shared engine (playground.js) handles mode, the challenges card,
// the toolbar, and the copy button. This file supplies the grid config.
// ============================================================
(function () {
    'use strict';

    // ---- DOM refs ----
    const preview = document.getElementById('gridPreview');
    const codeEl = document.getElementById('cssCode');
    const countEl = document.getElementById('itemCount');
    const selectedLabel = document.getElementById('selectedLabel');
    const addBtn = document.getElementById('addItem');
    const removeBtn = document.getElementById('removeItem');

    const containerControls = Array.from(document.querySelectorAll('[data-container]'));
    const itemControls = Array.from(document.querySelectorAll('[data-item]'));
    const valueSpans = Array.from(document.querySelectorAll('[data-for]'));

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

    // ---- presets ----
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
        engine.check();
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

    // ---- presets / reset (no challenge check — engine does that) ----
    function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        Object.keys(p).forEach(function (prop) { setContainerControl(prop, p[prop]); });
        updateValueSpans();
        applyContainer();
    }
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
    }

    // ---- challenge target resolution ----
    function targetValue(t) {
        if (t.type === 'item') {
            return getItemStyle(t.item)[t.prop];
        }
        const ctrl = containerControls.find(function (c) { return c.dataset.container === t.prop; });
        return ctrl ? ctrl.value : undefined;
    }
    function isSatisfied(t) {
        const v = targetValue(t);
        return t.test ? t.test(v) : String(v) === String(t.value);
    }

    // ---- wire to the engine ----
    let engine;
    engine = createPlayground({
        challenges: CHALLENGES,
        isSatisfied: isSatisfied,
        apply: applyContainer,
        reset: resetAll,
        applyPreset: applyPreset,
    });

    // ---- events: container controls ----
    containerControls.forEach(function (ctrl) {
        ctrl.addEventListener('change', function () { updateValueSpans(); applyContainer(); engine.check(); });
        ctrl.addEventListener('input', function () { updateValueSpans(); applyContainer(); engine.check(); });
    });

    // ---- events: item controls ----
    itemControls.forEach(function (ctrl) {
        const handler = function () {
            if (selectedIndex === null) return;
            setItemStyle(selectedIndex, ctrl.dataset.item, ctrl.value);
            paintItems();
            updateValueSpans();
            renderCode();
            engine.check();
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
            engine.check();
        }
    });
    removeBtn.addEventListener('click', function () {
        if (itemCount > 1) {
            itemCount--;
            if (selectedIndex !== null && selectedIndex >= itemCount) selectedIndex = null;
            countEl.textContent = String(itemCount);
            buildItems();
            syncItemControls();
            engine.check();
        }
    });
})();
