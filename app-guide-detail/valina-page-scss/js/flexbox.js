// ============================================================
// CSS Flex playground — the playground-specific logic.
// The shared engine (playground.js) handles mode, the challenges card,
// the toolbar, and the copy button. This file supplies the flex config.
// ============================================================
(function () {
    'use strict';

    // ---- DOM refs ----
    const preview = document.getElementById('flexPreview');
    const codeEl = document.getElementById('cssCode');
    const countEl = document.getElementById('itemCount');
    const selectedLabel = document.getElementById('selectedLabel');
    const addBtn = document.getElementById('addItem');
    const removeBtn = document.getElementById('removeItem');

    const containerControls = Array.from(document.querySelectorAll('[data-container]'));
    const itemControls = Array.from(document.querySelectorAll('[data-item]'));
    const valueSpans = Array.from(document.querySelectorAll('[data-for]'));

    // ---- defaults ----
    const DEFAULT_ITEM_COUNT = 4;
    const containerDefaults = {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
        alignContent: 'stretch',
        gap: '0',
    };
    const itemDefaults = {
        flexGrow: '0',
        flexShrink: '1',
        flexBasis: 'auto',
        order: '0',
        alignSelf: 'auto',
    };

    const palette = [
        '#3498db', '#9b59b6', '#e67e22', '#1abc9c',
        '#e74c3c', '#f1c40f', '#2ecc71', '#34495e',
    ];

    // ---- presets ----
    const PRESETS = {
        centered: { justifyContent: 'center', alignItems: 'center' },
        navbar: { justifyContent: 'space-between', alignItems: 'center' },
        stacked: { flexDirection: 'column', gap: '12' },
        grid: { flexWrap: 'wrap', gap: '16', justifyContent: 'flex-start' },
        spaced: { justifyContent: 'space-evenly' },
        reverse: { flexDirection: 'row-reverse' },
    };

    // ---- challenges ----
    const CHALLENGES = [
        {
            title: 'Center it',
            goal: 'Center the items both horizontally and vertically.',
            target: [
                { prop: 'justifyContent', value: 'center' },
                { prop: 'alignItems', value: 'center' },
            ],
        },
        {
            title: 'Push them apart',
            goal: 'Spread the items so the first and last sit at the edges (like a navbar).',
            target: [{ prop: 'justifyContent', value: 'space-between' }],
        },
        {
            title: 'Flip the row',
            goal: 'Reverse the horizontal order of the items.',
            target: [{ prop: 'flexDirection', value: 'row-reverse' }],
        },
        {
            title: 'Stack vertically',
            goal: 'Lay the items out top-to-bottom in a single column.',
            target: [{ prop: 'flexDirection', value: 'column' }],
        },
        {
            title: 'Wrap them',
            goal: 'Let the items wrap onto multiple lines instead of overflowing.',
            itemCount: 7,
            target: [{ prop: 'flexWrap', value: 'wrap' }],
        },
        {
            title: 'Add breathing room',
            goal: 'Set a gap of at least 20px between the items.',
            target: [{ prop: 'gap', test: function (v) { return Number(v) >= 20; } }],
        },
        {
            title: 'Grow the middle one',
            goal: 'Click item #3 and make it grow to fill the extra space.',
            target: [{ type: 'item', item: 2, prop: 'flexGrow', test: function (v) { return Number(v) > 0; } }],
        },
        {
            title: 'Send #1 to the back',
            goal: 'Click item #1 and raise its order so it moves to the end of the row.',
            target: [{ type: 'item', item: 0, prop: 'order', test: function (v) { return Number(v) > 0; } }],
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
            box.className = 'flex-item';
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
            box.style.flexGrow = s.flexGrow;
            box.style.flexShrink = s.flexShrink;
            box.style.flexBasis = s.flexBasis;
            box.style.order = s.order;
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
        preview.style.flexDirection = c.flexDirection;
        preview.style.justifyContent = c.justifyContent;
        preview.style.alignItems = c.alignItems;
        preview.style.flexWrap = c.flexWrap;
        preview.style.alignContent = c.alignContent;
        preview.style.gap = c.gap + 'px';
        renderCode();
    }
    function renderCode() {
        const c = readContainer();
        let css =
            '.container {\n' +
            '  display: flex;\n' +
            '  flex-direction: ' + c.flexDirection + ';\n' +
            '  justify-content: ' + c.justifyContent + ';\n' +
            '  align-items: ' + c.alignItems + ';\n' +
            '  flex-wrap: ' + c.flexWrap + ';\n' +
            '  align-content: ' + c.alignContent + ';\n' +
            '  gap: ' + c.gap + 'px;\n' +
            '}';
        if (selectedIndex !== null) {
            const s = getItemStyle(selectedIndex);
            css +=
                '\n\n.item-' + (selectedIndex + 1) + ' {\n' +
                '  flex-grow: ' + s.flexGrow + ';\n' +
                '  flex-shrink: ' + s.flexShrink + ';\n' +
                '  flex-basis: ' + s.flexBasis + ';\n' +
                '  order: ' + s.order + ';\n' +
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

    // per-challenge setup (e.g. item count for the "wrap" challenge)
    function loadChallenge(ch) {
        if (ch.itemCount) {
            itemCount = ch.itemCount;
            countEl.textContent = String(itemCount);
            buildItems();
        }
    }

    // ---- wire to the engine ----
    let engine;
    engine = createPlayground({
        challenges: CHALLENGES,
        isSatisfied: isSatisfied,
        apply: applyContainer,
        reset: resetAll,
        applyPreset: applyPreset,
        loadChallenge: loadChallenge,
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
        if (itemCount < 8) {
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
