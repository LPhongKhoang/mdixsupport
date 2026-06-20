// ============================================================
// CSS Centering playground — a technique picker based on the
// CSS-Tricks "Centering in CSS: A Complete Guide".
//
// Each technique defines the inline styles it puts on the parent
// (.center-stage) and child (.center-target). The generated CSS is
// read back from those applied styles, so it can never drift from
// what's actually rendered.
// ============================================================
(function () {
    'use strict';

    // ---- DOM refs ----
    const stage = document.getElementById('centerStage');
    const target = document.getElementById('centerTarget');
    const codeEl = document.getElementById('cssCode');
    const axisSel = document.getElementById('axis');
    const techSel = document.getElementById('technique');
    const techTitle = document.getElementById('techTitle');
    const techWhen = document.getElementById('techWhen');
    const copyBtn = document.getElementById('copyCode');
    const resetBtn = document.getElementById('resetBtn');

    const modeBtns = Array.from(document.querySelectorAll('[data-mode]'));
    const presetBtns = Array.from(document.querySelectorAll('[data-preset]'));

    const cardEl = document.getElementById('challengeCard');
    const progressEl = document.getElementById('challengeProgress');
    const statusEl = document.getElementById('challengeStatus');
    const titleEl = document.getElementById('challengeTitle');
    const goalEl = document.getElementById('challengeGoal');
    const prevBtn = document.getElementById('prevChallenge');
    const nextBtn = document.getElementById('nextChallenge');

    // ---- style properties we track (camelCase) for reset + code gen ----
    const PROPS = [
        'display', 'textAlign', 'position', 'top', 'right', 'bottom', 'left',
        'transform', 'margin', 'width', 'height', 'verticalAlign',
        'justifyContent', 'alignItems', 'flexDirection',
    ];

    const AXIS_LABELS = { horizontal: 'Horizontal', vertical: 'Vertical', both: 'Both (H + V)' };

    // ---- techniques (from the CSS-Tricks guide) ----
    const TECHNIQUES = [
        {
            id: 'text-align', label: 'text-align: center', axis: 'horizontal',
            when: 'For inline or inline-block elements in a block parent. Just set the parent’s text-align: center.',
            parent: { textAlign: 'center' },
            child: { display: 'inline-block' },
        },
        {
            id: 'margin-auto', label: 'margin: 0 auto', axis: 'horizontal',
            when: 'For a block-level element WITH a set width. margin-left/right of auto centers it.',
            parent: {},
            child: { display: 'block', width: '160px', margin: '0 auto' },
        },
        {
            id: 'table-cell', label: 'table-cell + vertical-align', axis: 'vertical',
            when: 'Make the parent behave like a table cell (display: table-cell) and use vertical-align: middle.',
            parent: { display: 'table-cell', height: '280px', verticalAlign: 'middle', textAlign: 'center' },
            child: { display: 'inline-block' },
        },
        {
            id: 'flex-col', label: 'flex column + justify-center', axis: 'vertical',
            when: 'Parent: display: flex; flex-direction: column; justify-content: center. Needs a fixed parent height.',
            parent: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
            child: {},
        },
        {
            id: 'abs-translateY', label: 'absolute + translateY(-50%)', axis: 'vertical',
            when: 'Unknown height: position the child at top: 50%, then lift it up half its height with transform.',
            parent: {},
            child: { position: 'absolute', top: '50%', transform: 'translateY(-50%)' },
        },
        {
            id: 'abs-translate', label: 'absolute + translate(-50%, -50%)', axis: 'both',
            when: 'Unknown width AND height: top/left 50% then translate(-50%, -50%). The classic both-axis method.',
            parent: {},
            child: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        },
        {
            id: 'abs-negmargin', label: 'absolute + negative margins', axis: 'both',
            when: 'Fixed width & height: top/left 50% then negative margins equal to half the size. Great cross-browser support.',
            parent: {},
            child: { position: 'absolute', top: '50%', left: '50%', width: '160px', height: '80px', margin: '-40px 0 0 -80px' },
        },
        {
            id: 'flex-center', label: 'flexbox (justify + align)', axis: 'both',
            when: 'The modern go-to for centering both ways: parent display: flex; justify-content: center; align-items: center.',
            parent: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
            child: {},
        },
        {
            id: 'grid-auto', label: 'grid + margin: auto', axis: 'both',
            when: 'Parent display: grid and the child margin: auto centers it within its grid area.',
            parent: { display: 'grid' },
            child: { margin: 'auto' },
        },
        {
            id: 'inset-auto', label: 'inset: 0 + margin: auto', axis: 'both',
            when: 'Modern absolute centering: stretch to all edges (top/right/bottom/left: 0) + margin: auto, with a set width & height.',
            parent: {},
            child: { position: 'absolute', top: '0', right: '0', bottom: '0', left: '0', margin: 'auto', width: '160px', height: '80px' },
        },
    ];

    // quick-jump presets: button data-preset -> technique id
    const PRESETS = { flex: 'flex-center', grid: 'grid-auto', translate: 'abs-translate', margin: 'margin-auto' };

    // ---- challenges ----
    const CHALLENGES = [
        { title: 'Center inline content', goal: 'Center the box horizontally using the simplest inline/parent method.', target: 'text-align' },
        { title: 'Center a fixed-width block', goal: 'Center a block element horizontally with auto margins (it needs a width).', target: 'margin-auto' },
        { title: 'Vertical via table-cell', goal: 'Vertically center using a table-cell parent and vertical-align.', target: 'table-cell' },
        { title: 'Vertical via flexbox', goal: 'Vertically center with a flex column and justify-content: center.', target: 'flex-col' },
        { title: 'Vertical, unknown height', goal: 'Vertically center an element of unknown height using absolute positioning.', target: 'abs-translateY' },
        { title: 'Both ways with flexbox', goal: 'Center horizontally and vertically with flexbox (the modern favorite).', target: 'flex-center' },
        { title: 'Both ways with grid', goal: 'Center in both directions using CSS grid.', target: 'grid-auto' },
        { title: 'Modern absolute centering', goal: 'Center a fixed-size box with inset: 0 + margin: auto.', target: 'inset-auto' },
    ];

    // ---- state ----
    let mode = 'free';
    let challengeIndex = 0;
    const solvedSet = new Set();
    let currentTech = 'text-align';

    // ---- helpers ----
    function clearStyles(el) {
        PROPS.forEach(function (p) { el.style[p] = ''; });
    }
    function camToKeb(c) {
        return c.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
    }
    // build a CSS block from the non-empty inline styles on an element
    function styleBlock(selector, el) {
        const lines = [];
        PROPS.forEach(function (p) {
            const v = el.style[p];
            if (v !== '' && v != null) lines.push('  ' + camToKeb(p) + ': ' + v + ';');
        });
        if (!lines.length) return '';
        return selector + ' {\n' + lines.join('\n') + '\n}';
    }

    // ---- apply a technique ----
    function applyTechnique(id) {
        const t = TECHNIQUES.find(function (x) { return x.id === id; });
        if (!t) return;
        currentTech = id;
        clearStyles(stage);
        clearStyles(target);
        Object.keys(t.parent).forEach(function (k) { stage.style[k] = t.parent[k]; });
        Object.keys(t.child).forEach(function (k) { target.style[k] = t.child[k]; });

        techTitle.textContent = t.label + '  ·  ' + AXIS_LABELS[t.axis];
        techWhen.textContent = t.when;

        const blocks = [styleBlock('.parent', stage), styleBlock('.child', target)].filter(Boolean);
        codeEl.textContent = blocks.join('\n\n');

        checkChallenge();
    }

    // ---- repopulate the technique dropdown for the chosen axis ----
    function populateTechniques() {
        const axis = axisSel.value;
        const list = TECHNIQUES.filter(function (t) { return t.axis === axis; });
        techSel.innerHTML = list.map(function (t) {
            return '<option value="' + t.id + '">' + t.label + '</option>';
        }).join('');
        if (!list.some(function (t) { return t.id === currentTech; })) {
            currentTech = list[0] ? list[0].id : currentTech;
        }
        techSel.value = currentTech;
        applyTechnique(currentTech);
    }

    // ---- challenges ----
    function checkChallenge() {
        if (mode !== 'challenge') return;
        const ch = CHALLENGES[challengeIndex];
        const solved = currentTech === ch.target;
        if (solved) solvedSet.add(challengeIndex);
        statusEl.textContent = solved ? '✓ Solved!' : 'Pick the matching technique';
        statusEl.classList.toggle('is-solved', solved);
        cardEl.classList.toggle('is-solved', solved);
        progressEl.textContent =
            'Challenge ' + (challengeIndex + 1) + ' / ' + CHALLENGES.length +
            '  ·  Solved ' + solvedSet.size + '/' + CHALLENGES.length;
    }
    function showChallenge(i) {
        challengeIndex = Math.max(0, Math.min(i, CHALLENGES.length - 1));
        const ch = CHALLENGES[challengeIndex];
        titleEl.textContent = 'Challenge ' + (challengeIndex + 1) + ': ' + ch.title;
        goalEl.textContent = ch.goal;
        checkChallenge();
    }
    function setMode(m) {
        mode = m;
        modeBtns.forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === m); });
        cardEl.hidden = (m !== 'challenge');
        if (m === 'challenge') showChallenge(challengeIndex);
    }

    // ---- presets / reset ----
    function jumpTo(id) {
        const t = TECHNIQUES.find(function (x) { return x.id === id; });
        if (!t) return;
        axisSel.value = t.axis;
        populateTechniques(); // rebuilds list + applies currentTech
        techSel.value = id;
        currentTech = id;
        applyTechnique(id);
    }
    function resetAll() {
        axisSel.value = 'horizontal';
        currentTech = 'text-align';
        populateTechniques();
    }

    // ---- events ----
    axisSel.addEventListener('change', populateTechniques);
    techSel.addEventListener('change', function () {
        currentTech = techSel.value;
        applyTechnique(currentTech);
    });
    modeBtns.forEach(function (b) {
        b.addEventListener('click', function () { setMode(b.dataset.mode); });
    });
    presetBtns.forEach(function (b) {
        b.addEventListener('click', function () { jumpTo(PRESETS[b.dataset.preset]); });
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
    populateTechniques();
})();
