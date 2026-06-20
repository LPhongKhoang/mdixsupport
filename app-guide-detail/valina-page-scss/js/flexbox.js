// ============================================================
// CSS Flex playground — wires controls to the live preview and
// to the generated-CSS panel. Vanilla JS, no dependencies.
// ============================================================
(function () {
    'use strict';

    // ---- DOM refs ----
    const preview = document.getElementById('flexPreview');
    const codeEl = document.getElementById('cssCode');
    const countEl = document.getElementById('itemCount');
    const selectedLabel = document.getElementById('selectedLabel');
    const copyBtn = document.getElementById('copyCode');
    const addBtn = document.getElementById('addItem');
    const removeBtn = document.getElementById('removeItem');

    const containerControls = Array.from(document.querySelectorAll('[data-container]'));
    const itemControls = Array.from(document.querySelectorAll('[data-item]'));
    const valueSpans = Array.from(document.querySelectorAll('[data-for]'));

    // ---- defaults & palette ----
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

    // ---- state ----
    let itemCount = 4;
    let selectedIndex = null;
    const itemStyles = {}; // index -> item prop object

    // ---- helpers ----
    function readContainer() {
        const c = {};
        containerControls.forEach(function (ctrl) {
            c[ctrl.dataset.container] = ctrl.value;
        });
        return c;
    }

    function getItemStyle(i) {
        return itemStyles[i] || Object.assign({}, itemDefaults);
    }

    function setItemStyle(i, prop, val) {
        if (!itemStyles[i]) itemStyles[i] = Object.assign({}, itemDefaults);
        itemStyles[i][prop] = val;
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
        if (selectedIndex !== null && selectedIndex >= itemCount) {
            selectedIndex = null;
        }
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
    }

    function syncItemControls() {
        if (selectedIndex === null) {
            selectedLabel.textContent = 'None selected — click a box below to edit its item properties.';
            itemControls.forEach(function (c) { c.value = itemDefaults[c.dataset.item]; });
            updateValueSpans();
            return;
        }
        const s = getItemStyle(selectedIndex);
        selectedLabel.textContent = 'Editing item #' + (selectedIndex + 1);
        itemControls.forEach(function (c) { c.value = s[c.dataset.item]; });
        updateValueSpans();
    }

    // ---- container application ----
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

    // ---- generated CSS ----
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
        }
    });

    removeBtn.addEventListener('click', function () {
        if (itemCount > 1) {
            itemCount--;
            if (selectedIndex !== null && selectedIndex >= itemCount) {
                selectedIndex = null;
            }
            countEl.textContent = String(itemCount);
            buildItems();
            syncItemControls();
        }
    });

    // ---- copy button ----
    // Falls back to a hidden textarea + execCommand for non-secure
    // contexts (e.g. opening the page directly via file://).
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
            try {
                document.execCommand('copy');
                resolve();
            } catch (e) {
                reject(e);
            } finally {
                document.body.removeChild(ta);
            }
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
