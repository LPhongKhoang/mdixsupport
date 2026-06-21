// ============================================================
// CSS Cascade Layers playground — based on the CSS-Tricks guide.
//
// One fixed target element:  <p id="intro" class="card">
// Several rules compete for its `color`. The user sets the layer
// order + each rule's selector / color / layer / !important, and
// the playground shows the real winner (rendered in an isolated
// iframe with genuine @layer CSS) PLUS a cascade breakdown that
// explains exactly why it won.
//
// Uses the shared createPlayground() engine for the toolbar,
// mode toggle, challenge tracking, presets, reset, and copy.
// ============================================================
(function () {
    'use strict';

    // ---- DOM refs ----
    const layerStackEl = document.getElementById('layerStack');
    const rulesListEl  = document.getElementById('rulesList');
    const codeEl       = document.getElementById('cssCode');
    const frame        = document.getElementById('previewFrame');
    const breakdownEl  = document.getElementById('breakdown');
    const winnerSwatch = document.getElementById('winnerSwatch');
    const winnerValue  = document.getElementById('winnerValue');
    const winnerRule   = document.getElementById('winnerRule');
    const newLayerInput = document.getElementById('newLayerName');
    const addLayerBtn   = document.getElementById('addLayerBtn');
    const addRuleBtn    = document.getElementById('addRuleBtn');
    const importantView = document.getElementById('importantView');

    // ---- simulator refs ----
    const walkBtn = document.getElementById('walkBtn');
    const simBar = document.getElementById('simBar');
    const simStepLabel = document.getElementById('simStepLabel');
    const simTitle = document.getElementById('simTitle');
    const simExplain = document.getElementById('simExplain');
    const simPrev = document.getElementById('simPrev');
    const simNext = document.getElementById('simNext');
    const simExit = document.getElementById('simExit');

    // ---- color-normalization probe (named colors → rgb for compare) ----
    const probe = document.createElement('div');
    probe.style.display = 'none';
    document.body.appendChild(probe);
    function toRGB(color) {
        probe.style.color = '';
        probe.style.color = color;
        return getComputedStyle(probe).color;
    }

    // ---- matching probe: which selectors actually hit the target ----
    const fixture = document.createElement('div');
    fixture.style.display = 'none';
    fixture.innerHTML = '<p id="intro" class="card">x</p>';
    document.body.appendChild(fixture);
    const targetEl = fixture.querySelector('#intro');
    function matchesTarget(sel) {
        if (!sel || !sel.trim()) return false;
        try { return fixture.querySelector(sel) === targetEl; }
        catch (e) { return false; } // invalid selector
    }

    // ============================================================
    // Specificity calculator → [a, b, c]
    // Handles *, type, .class, #id, [attr], :pseudo, ::pseudo-el,
    // and the functional :where() (0), :is/:not/:has/:matches (max of inner).
    // ============================================================
    function splitTop(s, sep) {
        const out = []; let depth = 0, cur = '';
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (ch === '(' || ch === '[') depth++;
            else if (ch === ')' || ch === ']') depth--;
            if (depth === 0 && ch === sep) { out.push(cur); cur = ''; }
            else cur += ch;
        }
        out.push(cur);
        return out;
    }
    function readBalanced(s, open) {
        let depth = 0;
        for (let i = open; i < s.length; i++) {
            if (s[i] === '(') depth++;
            else if (s[i] === ')') { depth--; if (depth === 0) return i; }
        }
        return s.length;
    }
    function specificity(sel) {
        sel = (sel || '').trim();
        let a = 0, b = 0, c = 0, i = 0;
        const n = sel.length;
        const isIdent = ch => /[\w-]/.test(ch);
        while (i < n) {
            const ch = sel[i];
            if (ch === '*' || /\s/.test(ch) || ch === '>' || ch === '+' || ch === '~') { i++; continue; }
            if (ch === '#') { a++; i++; while (i < n && isIdent(sel[i])) i++; continue; }
            if (ch === '.') { b++; i++; while (i < n && isIdent(sel[i])) i++; continue; }
            if (ch === '[') { b++; i++; while (i < n && sel[i] !== ']') i++; i++; continue; }
            if (ch === ':') {
                if (sel[i + 1] === ':') { c++; i += 2; while (i < n && isIdent(sel[i])) i++; continue; }
                i++; // single colon
                let name = '';
                while (i < n && isIdent(sel[i])) { name += sel[i]; i++; }
                if (i < n && sel[i] === '(') {
                    const close = readBalanced(sel, i);
                    const inner = sel.slice(i + 1, close);
                    i = close + 1;
                    if (name === 'where') { /* contributes nothing */ }
                    else if (name === 'is' || name === 'not' || name === 'matches' || name === 'has' || name === 'nthchild') {
                        let ma = 0, mb = 0, mc = 0;
                        splitTop(inner, ',').forEach(function (sub) {
                            const s = specificity(sub);
                            if (s[0] > ma || (s[0] === ma && (s[1] > mb || (s[1] === mb && s[2] > mc))))
                                { ma = s[0]; mb = s[1]; mc = s[2]; }
                        });
                        a += ma; b += mb; c += mc;
                    } else { b++; } // other functional pseudo-class (e.g. nth-child(n))
                } else { b++; } // simple pseudo-class
                continue;
            }
            if (/[a-zA-Z]/.test(ch)) { c++; while (i < n && isIdent(sel[i])) i++; continue; }
            i++; // anything else (e.g. stray chars)
        }
        return [a, b, c];
    }

    // ============================================================
    // Cascade comparator. Each rule gets a priority tuple; larger wins.
    //   [ importance, layerScore, specA, specB, specC, sourceOrder ]
    // layerScore depends on the rule's OWN importance (because the
    // importance step is compared first, the formula is consistent
    // within a bucket):
    //   normal   → un-layered = highest; layered = its index (later = higher)
    //   important → REVERSED: un-layered = lowest; layered = (count - index)
    // ============================================================
    function rankTuple(r) {
        const lc = state.layers.length;
        const imp = r.important ? 1 : 0;
        let ls;
        const idx = state.layers.indexOf(r.layer);
        if (r.layer === 'un-layered' || idx < 0) {
            ls = r.important ? -1 : (lc + 1); // un-layered: normal=high, important=low
        } else {
            ls = r.important ? (lc - idx) : idx;
        }
        const s = specificity(r.selector);
        return [imp, ls, s[0], s[1], s[2], r.order];
    }
    function cmpTuple(x, y) {
        for (let i = 0; i < x.length; i++) { if (x[i] !== y[i]) return x[i] - y[i]; }
        return 0;
    }

    // ---- candidate computation (sorted, winner first) ----
    function candidates() {
        const list = state.rules
            .map(function (r) { return { rule: r, matches: matchesTarget(r.selector) }; })
            .filter(function (c) { return c.matches; })
            .map(function (c) {
                c.spec = specificity(c.rule.selector);
                c.rank = rankTuple(c.rule);
                return c;
            })
            .sort(function (a, b) { return cmpTuple(b.rank, a.rank); });
        return list;
    }
    // One evaluation pass — list + winner share object identity, so callers can
    // compare `cand === winner` reliably. The winner is the top of the cascade
    // (list[0]); if that declaration is `revert-layer`, its effective value is
    // the next non-revert-layer candidate's color.
    function evaluate() {
        const list = candidates();
        const winner = list.length ? list[0] : null;
        return { list: list, winner: winner };
    }
    function effectiveColor(list, winner) {
        if (!winner) return null;
        if (winner.rule.special !== 'revert-layer') return winner.rule.color;
        let saw = false;
        for (let i = 0; i < list.length; i++) {
            if (saw && list[i].rule.special !== 'revert-layer') return list[i].rule.color;
            if (list[i] === winner) saw = true;
        }
        return null; // every declaration reverts → inherits
    }

    // ============================================================
    // State + scenarios
    // ============================================================
    const DEFAULT = {
        layers: ['reset', 'base', 'components', 'utilities'],
        rules: [
            { selector: '*',        color: '#9ca3af', layer: 'reset',      important: false },
            { selector: 'p',        color: '#1e3a8a', layer: 'base',       important: false },
            { selector: '.card',    color: '#7c3aed', layer: 'components', important: false },
            { selector: '#intro',   color: '#0d9488', layer: 'utilities',  important: false },
        ],
    };

    const PRESETS = {
        // Un-layered styles beat every layer (the article's Q1).
        unlayered: {
            layers: ['ultra-high-priority'],
            rules: [
                { selector: '#intro', color: '#ef4444', layer: 'ultra-high-priority', important: false },
                { selector: 'p',      color: '#22c55e', layer: 'un-layered',          important: false },
            ],
        },
        // !important REVERSES layer order: the lowest layer wins (Q2).
        important: {
            layers: ['ren', 'stimpy'],
            rules: [
                { selector: 'p', color: '#ef4444', layer: 'ren',         important: true },
                { selector: 'p', color: '#22c55e', layer: 'un-layered',  important: false },
                { selector: 'p', color: '#3b82f6', layer: 'stimpy',      important: true },
            ],
        },
        // Grouped layers stay together; layer order beats specificity (Q3).
        grouped: {
            layers: ['Montagues.Romeo', 'Montagues.Benvolio', 'Capulets.Juliet', 'Capulets.Tybalt', 'Verona'],
            rules: [
                { selector: '#intro', color: '#ef4444', layer: 'Montagues.Romeo',    important: false },
                { selector: 'p',      color: '#f97316', layer: 'Montagues.Benvolio', important: false },
                { selector: 'p',      color: '#eab308', layer: 'Capulets.Juliet',    important: false },
                { selector: '#intro', color: '#22c55e', layer: 'Capulets.Tybalt',    important: false },
                { selector: '*',      color: '#3b82f6', layer: 'Verona',             important: false },
            ],
        },
        // A realistic ITCSS-style architecture.
        itcss: {
            layers: ['reset', 'element', 'theme', 'components', 'utilities'],
            rules: [
                { selector: '*',     color: '#94a3b8', layer: 'reset',      important: false },
                { selector: 'p',     color: '#0f766e', layer: 'element',    important: false },
                { selector: '.card', color: '#7c3aed', layer: 'theme',      important: false },
                { selector: '#intro', color: '#db2777', layer: 'components', important: false },
                { selector: '.card', color: '#ea580c', layer: 'utilities',  important: false },
            ],
        },
        // revert-layer rolls a value back to the previous layer.
        revert: {
            layers: ['default', 'theme', 'override'],
            rules: [
                { selector: '#intro', color: '#7f1d1d', layer: 'default',  important: false },
                { selector: '#intro', color: '#7c3aed', layer: 'theme',    important: false },
                { selector: '#intro', color: 'revert-layer', layer: 'override', important: false, special: 'revert-layer' },
            ],
        },
    };

    const CHALLENGES = [
        {
            title: 'Un-layered styles always win',
            goal: 'The paragraph is red because #intro out-specifies p inside the same layer. Make it GREEN — un-layered styles beat every layer. (Tip: change the green rule\'s layer.)',
            target: { color: '#22c55e' },
            setup: {
                layers: ['themes'],
                rules: [
                    { selector: '#intro', color: '#ef4444', layer: 'themes',      important: false },
                    { selector: 'p',      color: '#22c55e', layer: 'themes',      important: false },
                ],
            },
        },
        {
            title: '!important REVERSES the layer order',
            goal: 'Three !important rules. Among important styles the order flips — the LOWEST layer wins. Make the paragraph RED by moving its rule to the lowest layer.',
            target: { color: '#ef4444' },
            setup: {
                layers: ['alpha', 'beta', 'gamma'],
                rules: [
                    { selector: 'p', color: '#ef4444', layer: 'beta',  important: true },
                    { selector: 'p', color: '#3b82f6', layer: 'gamma', important: true },
                    { selector: 'p', color: '#22c55e', layer: 'alpha', important: true },
                ],
            },
        },
        {
            title: 'Layer order beats specificity',
            goal: 'The * selector has ZERO specificity — yet it can beat #intro, if it lives in a higher layer. Make the paragraph BLUE by reordering layers so the * rule\'s layer is on top.',
            target: { color: '#3b82f6' },
            setup: {
                layers: ['reset', 'base', 'components'],
                rules: [
                    { selector: '#intro', color: '#ef4444', layer: 'base',       important: false },
                    { selector: '*',      color: '#3b82f6', layer: 'reset',      important: false },
                ],
            },
        },
        {
            title: 'Within a layer, specificity decides',
            goal: 'Inside one layer, the more specific selector wins. The paragraph is blue (#intro wins). Edit the ORANGE rule\'s selector to be MORE specific than #intro (try #intro.card) so orange wins.',
            target: { color: '#f97316' },
            setup: {
                layers: ['app'],
                rules: [
                    { selector: 'p',      color: '#f97316', layer: 'app', important: false },
                    { selector: '#intro', color: '#3b82f6', layer: 'app', important: false },
                ],
            },
        },
    ];

    const state = { layers: [], rules: [] };

    // simulator state: step 0 = intro, 1-4 = after each cascade filter
    const simState = { active: false, step: 0, steps: [], elim: new Map() };
    let idCounter = 0;
    function assignIds() {
        state.rules.forEach(function (r, i) { r.id = 'r' + (++idCounter); r.order = i; });
    }
    function byId(id) {
        for (let i = 0; i < state.rules.length; i++) if (state.rules[i].id === id) return state.rules[i];
        return null;
    }
    function setScenario(sc) {
        state.layers = sc.layers.slice();
        state.rules = sc.rules.map(function (r) {
            const copy = { selector: r.selector, color: r.color, layer: r.layer, important: !!r.important };
            if (r.special) copy.special = r.special;
            return copy;
        });
        // a rule may reference a layer not in the list → keep as-is; rank treats unknown as un-layered
        assignIds();
        simState.step = 0; // restart the walk-through on a fresh scenario
    }

    // ============================================================
    // Rendering
    // ============================================================
    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
        });
    }

    // ---- the generated, real @layer CSS (used by code panel + iframe) ----
    function buildCSS() {
        const lines = ['@layer ' + state.layers.join(', ') + ';', ''];
        state.layers.forEach(function (layer) {
            const rs = state.rules.filter(function (r) { return r.layer === layer; });
            if (!rs.length) return;
            lines.push('@layer ' + layer + ' {');
            rs.forEach(function (r) {
                lines.push('  ' + r.selector + ' { color: ' + r.color + (r.important ? ' !important' : '') + '; }');
            });
            lines.push('}');
            lines.push('');
        });
        const un = state.rules.filter(function (r) { return r.layer === 'un-layered'; });
        if (un.length) {
            lines.push('/* un-layered */');
            un.forEach(function (r) {
                lines.push(r.selector + ' { color: ' + r.color + (r.important ? ' !important' : '') + '; }');
            });
        }
        return lines.join('\n');
    }

    function renderDerived() {
        const css = buildCSS();
        codeEl.textContent = css;

        // isolated iframe with the genuine CSS
        const doc =
            '<!doctype html><html><head><meta charset="utf-8"><style>' +
            'html,body{margin:0;height:100%}' +
            'body{display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;background:#fff}' +
            '#intro{font-size:1.35rem;font-weight:700;padding:12px 20px;border-radius:8px;border:1px dashed #cbd5e1}' +
            css +
            '</style></head><body><p id="intro" class="card">Hello, Cascade!</p></body></html>';
        frame.srcdoc = doc;

        // winner (shared evaluation — list + winner share identity)
        const ev = evaluate();
        const w = ev.winner;
        const eff = effectiveColor(ev.list, w);
        if (w && eff) {
            winnerSwatch.style.background = eff;
            winnerValue.textContent = w.rule.color + (w.rule.special === 'revert-layer' ? '  (→ reverts to ' + eff + ')' : '');
            winnerRule.textContent = w.rule.selector + '  ·  layer: ' + w.rule.layer + (w.rule.important ? '  ·  !important' : '');
        } else {
            winnerSwatch.style.background = '#fff';
            winnerValue.textContent = w ? 'reverts all the way (inherits)' : 'no rule matches (inherits)';
            winnerRule.textContent = '';
        }

        renderBreakdown(ev.list, w);
    }

    function reasonFor(cand, winner) {
        if (cand === winner) return '<span class="cl-rule-row__badge">WINS</span>';
        const r = cand.rule, w = winner.rule;
        if (r.special === 'revert-layer') return 'revert-layer (rolls back)';
        if (r.important !== w.important) return 'beaten by a !important rule';
        if (cand.rank[1] !== winner.rank[1]) return r.important ? 'higher !important layer wins' : 'lower priority layer';
        if (cand.spec[0] !== winner.spec[0] || cand.spec[1] !== winner.spec[1] || cand.spec[2] !== winner.spec[2]) return 'lower specificity';
        return 'earlier in source order';
    }

    // ============================================================
    // Cascade simulator — decompose the winner into the browser's
    // ordered steps (importance → layers → specificity → order),
    // recording which step each candidate is eliminated at.
    // ============================================================
    function specGT(a, b) {
        return a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])));
    }
    function specEQ(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }
    function plural(n) { return n === 1 ? '' : 's'; }

    function computeCascadeSteps(list) {
        const elim = new Map();
        const steps = [];
        let pool = list.slice();

        // Step 1 — importance (rank[0])
        let maxImp = 0;
        pool.forEach(function (c) { if (c.rank[0] > maxImp) maxImp = c.rank[0]; });
        let cut = pool.filter(function (c) { return c.rank[0] < maxImp; });
        cut.forEach(function (c) { elim.set(c, 1); });
        pool = pool.filter(function (c) { return c.rank[0] === maxImp; });
        steps.push({ n: 1, title: 'Importance & origin', cut: cut, pool: pool.slice(), isImp: maxImp === 1 });

        // Step 2 — layers (rank[1])
        let maxLS = -Infinity;
        pool.forEach(function (c) { if (c.rank[1] > maxLS) maxLS = c.rank[1]; });
        cut = pool.filter(function (c) { return c.rank[1] < maxLS; });
        cut.forEach(function (c) { elim.set(c, 2); });
        pool = pool.filter(function (c) { return c.rank[1] === maxLS; });
        steps.push({ n: 2, title: 'Cascade layers', cut: cut, pool: pool.slice(), isImp: maxImp === 1 });

        // Step 3 — specificity (rank[2,3,4])
        let maxSpec = [0, 0, 0];
        pool.forEach(function (c) { const s = [c.rank[2], c.rank[3], c.rank[4]]; if (specGT(s, maxSpec)) maxSpec = s; });
        cut = pool.filter(function (c) { const s = [c.rank[2], c.rank[3], c.rank[4]]; return !specEQ(s, maxSpec); });
        cut.forEach(function (c) { elim.set(c, 3); });
        pool = pool.filter(function (c) { const s = [c.rank[2], c.rank[3], c.rank[4]]; return specEQ(s, maxSpec); });
        steps.push({ n: 3, title: 'Specificity', cut: cut, pool: pool.slice(), maxSpec: maxSpec });

        // Step 4 — source order (rank[5])
        let maxOrder = -1;
        pool.forEach(function (c) { if (c.rank[5] > maxOrder) maxOrder = c.rank[5]; });
        const winner = pool.filter(function (c) { return c.rank[5] === maxOrder; })[0] || null;
        cut = pool.filter(function (c) { return c.rank[5] < maxOrder; });
        cut.forEach(function (c) { elim.set(c, 4); });
        steps.push({ n: 4, title: 'Source order', cut: cut, pool: winner ? [winner] : [], winner: winner });

        return { steps: steps, elim: elim };
    }

    function selDesc(c) {
        const v = c.rule.special === 'revert-layer' ? 'revert-layer' : c.rule.color;
        return '<code>' + esc(c.rule.selector) + '</code> (' + esc(v) + ')';
    }
    function stepExplanation(st) {
        const cutN = st.cut.length, poolN = st.pool.length;
        if (st.n === 1) {
            if (st.isImp) {
                return 'The cascade weighs <strong>importance</strong> first. <code>!important</code> beats normal, so '
                    + (cutN ? cutN + ' normal rule' + plural(cutN) + ' ' + (cutN === 1 ? 'is' : 'are') + ' set aside. ' : '')
                    + '<strong>' + poolN + '</strong> !important rule' + plural(poolN) + ' continue.';
            }
            return 'The cascade weighs <strong>importance</strong> first. No <code>!important</code> rules here, so nothing is cut — normal styles all move on.';
        }
        if (st.n === 2) {
            if (!poolN) return 'No rules remain to filter by layer.';
            const layer = st.pool[0].rule.layer;
            const lp = st.isImp
                ? (layer === 'un-layered'
                    ? 'un-layered <code>!important</code> is the <em>weakest</em> of the important layers'
                    : 'important layers run in <strong>reverse</strong> — the lowest layer (<code>' + esc(layer) + '</code>) wins')
                : (layer === 'un-layered'
                    ? '<strong>un-layered</strong> styles outrank every layer'
                    : 'the highest-priority layer is <code>' + esc(layer) + '</code>');
            return 'Next, <strong>layers</strong> are resolved by priority: ' + lp + '. '
                + (cutN ? cutN + ' rule' + plural(cutN) + ' in lower-priority layers eliminated. ' : '')
                + '<strong>' + poolN + '</strong> remain.';
        }
        if (st.n === 3) {
            if (!poolN) return 'No rules remain to filter by specificity.';
            const sp = st.pool[0].spec;
            if (cutN === 0) return 'Only one rule is left, so <strong>specificity</strong> has no tie to break (' + sp.join(', ') + ').';
            return 'Within a layer, the most <strong>specific</strong> selector wins. Survivors share (' + sp.join(', ') + '); '
                + cutN + ' lower-specificity rule' + plural(cutN) + ' eliminated.';
        }
        // n === 4
        if (!st.winner) return 'No winner could be determined.';
        if (cutN === 0) return 'No tie remains, so <strong>source order</strong> isn’t needed. Winner: ' + selDesc(st.winner) + '.';
        return 'When specificity ties, the rule written <strong>later</strong> wins. → Winner: ' + selDesc(st.winner) + '.';
    }
    function formatIntro(steps) {
        const total = steps[0].pool.length + steps[0].cut.length;
        if (!total) return 'No rule matches <code>#intro</code>, so there is nothing to resolve.';
        return 'The browser resolves this conflict in <strong>four ordered steps</strong>: '
            + 'importance → layers → specificity → source order. '
            + 'Press <strong>Next</strong> to apply each filter until one rule remains.';
    }
    function renderSimBar() {
        const s = simState;
        if (!s.steps.length) return;
        if (s.step === 0) {
            simStepLabel.textContent = 'Start';
            simTitle.textContent = 'Walk the cascade, step by step';
            simExplain.innerHTML = formatIntro(s.steps);
            simNext.textContent = '▶ Begin';
            simPrev.disabled = true;
        } else {
            const st = s.steps[s.step - 1];
            simStepLabel.textContent = 'Step ' + s.step + ' of 4';
            simTitle.textContent = st.n + '. ' + st.title;
            simExplain.innerHTML = stepExplanation(st);
            simNext.textContent = s.step >= 4 ? '↺ Restart' : (s.step === 3 ? 'Reveal winner ▶' : 'Next ▶');
            simPrev.disabled = false;
        }
    }

    // ---- shared row markup ----
    function swatchBgFor(rule) {
        return rule.color === 'revert-layer'
            ? 'repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 3px,#fff 3px,#fff 6px)'
            : rule.color;
    }
    function rowMarkup(c, cls, reasonHTML) {
        return (
            '<div class="' + cls + '">' +
            '<span class="cl-rule-row__swatch" style="background:' + esc(swatchBgFor(c.rule)) + '"></span>' +
            '<span class="cl-rule-row__sel">' + esc(c.rule.selector) + '</span>' +
            '<span class="cl-rule-row__layer">' + esc(c.rule.layer) + '</span>' +
            (c.rule.important ? '<span class="cl-rule-row__imp">!important</span>' : '') +
            '<span class="cl-rule-row__reason">' + reasonHTML + '</span>' +
            '</div>'
        );
    }

    function renderBreakdown(matching, winner) {
        const nonMatching = state.rules.filter(function (r) { return !matchesTarget(r.selector); });
        let html = '';

        if (simState.active) {
            const res = computeCascadeSteps(matching);
            simState.steps = res.steps;
            simState.elim = res.elim;
            if (!matching.length) {
                html += '<p class="cl-empty">No rule matches <code>#intro</code> — there is nothing to resolve.</p>';
            }
            matching.forEach(function (c) {
                const es = simState.elim.get(c);            // 1-4, or undefined = winner
                const isWinner = (es === undefined);
                const eliminated = !isWinner && es <= simState.step;
                const revealed = isWinner && simState.step === 4;
                let cls = 'cl-rule-row', tag;
                if (revealed) { cls += ' cl-rule-row--winner'; tag = '<span class="cl-rule-row__badge">WINS</span>'; }
                else if (eliminated) { cls += ' cl-rule-row--elim'; tag = '<span class="cl-rule-row__cut">✗ step ' + es + '</span>'; }
                else { cls += ' cl-rule-row--alive'; tag = '<span class="cl-rule-row__running">in the running</span>'; }
                html += rowMarkup(c, cls, tag);
            });
        } else {
            matching.forEach(function (c) {
                const w = c === winner;
                html += rowMarkup(c, 'cl-rule-row' + (w ? ' cl-rule-row--winner' : ''), reasonFor(c, winner));
            });
            if (!matching.length) {
                html += '<p class="cl-empty">No rule matches <code>#intro</code> — it inherits.</p>';
            }
        }

        nonMatching.forEach(function (r) {
            html += rowMarkup({ rule: r }, 'cl-rule-row cl-rule-row--nomatch', 'selector doesn’t match');
        });
        breakdownEl.innerHTML = html;

        if (simState.active) renderSimBar();
    }

    function countInLayer(layer) {
        return state.rules.filter(function (r) { return r.layer === layer; }).length;
    }

    function renderLayerStack() {
        const reversed = importantView.checked;
        let order = state.layers.slice();
        let html = '';

        if (reversed) {
            html += '<div class="cl-layer cl-layer--reversed-note">!important order — layers reversed (lowest layer wins). Un-layered is now the weakest !important.</div>';
            // lowest layer first (it's the strongest !important), un-layered last
            order.forEach(function (layer) {
                html += layerChip(layer, false);
            });
            html += layerChip('un-layered', true);
        } else {
            // un-layered on top, then highest-index layer → lowest
            html += layerChip('un-layered', true);
            for (let i = state.layers.length - 1; i >= 0; i--) {
                html += layerChip(state.layers[i], false);
            }
        }
        layerStackEl.innerHTML = html;
    }

    function layerChip(layer, isUnlayered) {
        const idx = state.layers.indexOf(layer);
        const count = countInLayer(layer);
        const rankLabel = isUnlayered
            ? (importantView.checked ? 'weakest !important' : 'highest priority')
            : (importantView.checked
                ? (idx === 0 ? 'strongest !important' : '')
                : (idx === state.layers.length - 1 ? 'top layer' : ''));
        const buttons = isUnlayered ? '' :
            '<div class="cl-layer__btns">' +
            '<button type="button" data-up="' + esc(layer) + '" title="higher priority" ' + (idx >= state.layers.length - 1 ? 'disabled' : '') + '>▲</button>' +
            '<button type="button" data-down="' + esc(layer) + '" title="lower priority" ' + (idx <= 0 ? 'disabled' : '') + '>▼</button>' +
            '<button type="button" data-rm="' + esc(layer) + '" title="remove layer">✕</button>' +
            '</div>';
        return (
            '<div class="cl-layer' + (isUnlayered ? ' cl-layer--unlayered' : '') + '">' +
            '<span class="cl-layer__name">' + esc(layer) + '</span>' +
            (rankLabel ? '<span class="cl-layer__rank">' + rankLabel + '</span>' : '') +
            '<span class="cl-layer__count">' + count + ' rule' + (count === 1 ? '' : 's') + '</span>' +
            buttons +
            '</div>'
        );
    }

    function ruleRowHTML(r) {
        const spec = specificity(r.selector);
        const match = matchesTarget(r.selector);
        const opts = state.layers.map(function (l) {
            return '<option value="' + esc(l) + '"' + (l === r.layer ? ' selected' : '') + '>' + esc(l) + '</option>';
        }).join('') + '<option value="un-layered"' + (r.layer === 'un-layered' ? ' selected' : '') + '>un-layered</option>';
        const colorCell = r.special === 'revert-layer'
            ? '<div class="cl-rule__color cl-rule__color--special" title="revert-layer keyword">↩</div>'
            : '<input class="cl-rule__color" type="color" value="' + esc(r.color) + '">';
        return (
            '<div class="cl-rule" data-rule="' + esc(r.id) + '">' +
            '<div class="cl-rule__row">' +
            '<input class="cl-rule__selector' + (match ? '' : ' is-nomatch') + '" type="text" value="' + esc(r.selector) + '" spellcheck="false" autocomplete="off" placeholder="selector">' +
            colorCell +
            '<select class="cl-rule__layer">' + opts + '</select>' +
            '<label class="cl-rule__imp' + (r.important ? ' is-on' : '') + '"><input type="checkbox"' + (r.important ? ' checked' : '') + '>!imp</label>' +
            '<button class="cl-rule__del" type="button" title="delete rule">✕</button>' +
            '</div>' +
            '<div class="cl-rule__meta">' +
            '<span class="cl-rule__spec">' + spec.join(',') + '</span>' +
            '<span class="cl-rule__match ' + (match ? 'is-yes' : 'is-no') + '">' + (match ? '✓ matches' : '✗ no match') + '</span>' +
            '</div>' +
            '</div>'
        );
    }

    function renderRulesList() {
        rulesListEl.innerHTML = state.rules.map(ruleRowHTML).join('');
    }

    function refreshRow(id) {
        const r = byId(id); if (!r) return;
        const row = rulesListEl.querySelector('.cl-rule[data-rule="' + id + '"]');
        if (!row) return;
        const spec = specificity(r.selector);
        const match = matchesTarget(r.selector);
        row.querySelector('.cl-rule__spec').textContent = spec.join(',');
        const m = row.querySelector('.cl-rule__match');
        m.className = 'cl-rule__match ' + (match ? 'is-yes' : 'is-no');
        m.textContent = match ? '✓ matches' : '✗ no match';
        row.querySelector('.cl-rule__selector').classList.toggle('is-nomatch', !match);
    }

    function renderAll() { renderRulesList(); renderLayerStack(); renderDerived(); }

    // ============================================================
    // Live sync helpers
    // ============================================================
    let pg; // set after createPlayground
    function liveSync() { renderDerived(); renderLayerStack(); pg.check(); }      // value edits (keep input focus)
    function fullSync() { renderAll(); pg.check(); }                              // structural changes

    // ============================================================
    // Event handling (delegation)
    // ============================================================
    rulesListEl.addEventListener('input', function (e) {
        const t = e.target;
        const row = t.closest('.cl-rule'); if (!row) return;
        const id = row.getAttribute('data-rule');
        const r = byId(id); if (!r) return;
        if (t.classList.contains('cl-rule__selector')) {
            r.selector = t.value; refreshRow(id); liveSync();
        } else if (t.classList.contains('cl-rule__color')) {
            r.color = t.value; liveSync();
        }
    });
    rulesListEl.addEventListener('change', function (e) {
        const t = e.target;
        const row = t.closest('.cl-rule'); if (!row) return;
        const id = row.getAttribute('data-rule');
        const r = byId(id); if (!r) return;
        if (t.classList.contains('cl-rule__layer')) { r.layer = t.value; liveSync(); }
        else if (t.matches('.cl-rule__imp input')) {
            r.important = t.checked;
            t.parentElement.classList.toggle('is-on', r.important);
            liveSync();
        }
    });
    rulesListEl.addEventListener('click', function (e) {
        const del = e.target.closest('.cl-rule__del');
        if (!del) return;
        const id = del.closest('.cl-rule').getAttribute('data-rule');
        state.rules = state.rules.filter(function (r) { return r.id !== id; });
        assignIds(); fullSync();
    });

    layerStackEl.addEventListener('click', function (e) {
        const up = e.target.getAttribute('data-up');
        const down = e.target.getAttribute('data-down');
        const rm = e.target.getAttribute('data-rm');
        if (up) { moveLayer(up, +1); fullSync(); }
        else if (down) { moveLayer(down, -1); fullSync(); }
        else if (rm) { removeLayer(rm); fullSync(); }
    });
    function moveLayer(layer, dir) {
        const i = state.layers.indexOf(layer); const j = i + dir;
        if (i < 0 || j < 0 || j >= state.layers.length) return;
        const tmp = state.layers[i]; state.layers[i] = state.layers[j]; state.layers[j] = tmp;
    }
    function removeLayer(layer) {
        state.layers = state.layers.filter(function (l) { return l !== layer; });
        // rules that referenced it fall back to un-layered (rank treats unknown as un-layered)
        state.rules.forEach(function (r) { if (r.layer === layer) r.layer = 'un-layered'; });
    }

    addLayerBtn.addEventListener('click', function () {
        const name = newLayerInput.value.trim();
        if (!name || state.layers.indexOf(name) >= 0) return;
        state.layers.push(name); // becomes the new highest-priority layer
        newLayerInput.value = '';
        fullSync();
    });
    newLayerInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addLayerBtn.click(); });

    addRuleBtn.addEventListener('click', function () {
        const layer = state.layers.length ? state.layers[state.layers.length - 1] : 'un-layered';
        state.rules.push({ selector: 'p', color: '#3498db', layer: layer, important: false });
        assignIds(); fullSync();
    });

    importantView.addEventListener('change', function () { renderLayerStack(); });

    // ---- cascade simulator controls ----
    walkBtn.addEventListener('click', function () {
        simState.active = !simState.active;
        simState.step = 0;
        walkBtn.textContent = simState.active ? '✓ Exit walk-through' : '▶ Walk the cascade';
        walkBtn.classList.toggle('is-active', simState.active);
        simBar.hidden = !simState.active;
        renderDerived();
    });
    simNext.addEventListener('click', function () {
        simState.step = simState.step >= 4 ? 0 : simState.step + 1;
        renderDerived();
    });
    simPrev.addEventListener('click', function () {
        simState.step = Math.max(0, simState.step - 1);
        renderDerived();
    });
    simExit.addEventListener('click', function () {
        simState.active = false;
        simState.step = 0;
        walkBtn.textContent = '▶ Walk the cascade';
        walkBtn.classList.remove('is-active');
        simBar.hidden = true;
        renderDerived();
    });

    // ============================================================
    // Shared-engine config
    // ============================================================
    pg = window.createPlayground({
        challenges: CHALLENGES.map(function (c) { return { title: c.title, goal: c.goal, target: c.target }; }),

        isSatisfied: function (target) {
            const ev = evaluate();
            const eff = effectiveColor(ev.list, ev.winner);
            return eff != null && toRGB(eff) === toRGB(target.color);
        },

        apply: function () { renderAll(); },
        reset: function () { setScenario(DEFAULT); },
        applyPreset: function (name) { if (PRESETS[name]) { setScenario(PRESETS[name]); renderAll(); } },
        loadChallenge: function (ch) {
            const full = CHALLENGES.filter(function (c) { return c.title === ch.title; })[0];
            if (full) setScenario(full.setup);
        },
    });
})();
