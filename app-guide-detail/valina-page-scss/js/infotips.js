// ============================================================
// Shared property tooltips.
//
// Scans every page for `.controls__label` whose text is a known
// CSS property, and attaches a small ⓘ that reveals a concise
// explanation on hover / focus / click. One script, one dictionary
// — works on any playground whose controls use the shared labels.
//
// Explanations may be scoped per-page (e.g. "grid:justify-content"
// beats the generic "justify-content") since the same property can
// mean slightly different things in flex vs grid.
// ============================================================
(function () {
    'use strict';

    const EXPLAIN = {
        // ---- Flexbox ----
        'flex-direction': 'Sets the <b>main axis</b> items flow along. <code>row</code> (default) and <code>row-reverse</code> go horizontally; <code>column</code> / <code>column-reverse</code> stack vertically. It also decides which axis <code>justify-content</code> vs <code>align-items</code> control.',
        'flex:justify-content': 'Spreads items along the <b>main axis</b>. <code>flex-start</code> packs to the start, <code>center</code> groups them centered, <code>space-between</code> pushes first &amp; last to the edges, <code>space-around</code> adds equal space around each, <code>space-evenly</code> makes every gap identical.',
        'flex:align-items': 'Aligns items along the <b>cross axis</b> (perpendicular to flow). <code>stretch</code> (default) fills the line height; <code>flex-start</code>/<code>flex-end</code> pack to top/bottom; <code>center</code> centers them; <code>baseline</code> lines up text baselines.',
        'flex-wrap': 'Whether items can wrap onto new lines. <code>nowrap</code> (default) keeps one line (they shrink or overflow); <code>wrap</code> lets them flow onto extra lines; <code>wrap-reverse</code> wraps upward.',
        'flex:align-content': 'Only matters when items <b>wrap</b> onto multiple lines — it spaces those packed lines along the cross axis (like <code>justify-content</code> for lines). Ignored with a single line.',
        'flex:align-self': 'Overrides the container’s <code>align-items</code> for <b>this one item</b> — same values (<code>stretch</code>, <code>flex-start</code>, <code>center</code>…).',
        'flex-grow': 'How much an item <b>grows</b> to fill free space, relative to siblings. <code>0</code> (default) = don’t grow; <code>1</code> = grow equally; <code>2</code> = take twice the share of a <code>1</code> sibling.',
        'flex-shrink': 'How much an item <b>shrinks</b> when there isn’t enough room. <code>1</code> (default) shrinks equally; <code>0</code> = never shrink; higher values shrink more.',
        'flex-basis': 'The <b>starting size</b> before grow/shrink apply. <code>auto</code> (default) uses the item’s content/width; a fixed value like <code>200px</code> sets the base.',
        'order': 'Reorders items visually. Default <code>0</code>; lower comes first, higher later. Changes paint order only — not the DOM/source order.',
        'gap': 'Empty space <b>between</b> items (and between wrapped lines). Shorthand for <code>row-gap</code> + <code>column-gap</code>.',

        // ---- Grid ----
        'grid-template-columns': 'Defines the <b>column tracks</b>. Space-separated sizes: <code>1fr 1fr 1fr</code> = 3 equal columns; <code>200px 1fr</code> = fixed then flexible; <code>repeat(4, 1fr)</code> = four equal. <code>fr</code> = a share of leftover space.',
        'grid-template-rows': 'Defines the <b>row tracks</b>, same syntax as columns. Often left unset so rows auto-size to their content.',
        'grid:justify-content': 'Aligns the <b>whole grid</b> within the container along the row axis — only visible when the grid is smaller than the container (e.g. fixed-size tracks). Same spread values as flexbox (<code>start</code>, <code>center</code>, <code>space-between</code>…).',
        'grid:align-content': 'Aligns the <b>whole grid</b> along the column axis when it’s smaller than the container.',
        'justify-items': 'Aligns each item <b>inside its own cell</b> along the row (inline) axis. <code>stretch</code> (default) fills the cell; <code>start</code>/<code>end</code>/<code>center</code> shrink and place it.',
        'grid:align-items': 'Aligns each item <b>inside its cell</b> along the column (block) axis. <code>stretch</code> fills; <code>start</code>/<code>end</code>/<code>center</code> place it.',
        'grid:align-self': 'Overrides <code>align-items</code> for <b>this item</b> — aligns it inside its cell along the column axis.',
        'justify-self': 'Overrides <code>justify-items</code> for <b>this item</b> — aligns it inside its cell along the row axis.',
        'grid-auto-flow': 'How items are placed into implicit tracks. <code>row</code> (default) fills left→right then down; <code>column</code> fills top→bottom then across; add <code>dense</code> to backfill earlier gaps.',
        'grid-column': 'Which columns an item <b>spans</b> — <code>start / end</code>, e.g. <code>1 / 3</code> spans columns 1–2; <code>1 / -1</code> spans the full width; <code>span 2</code> covers two tracks.',
        'grid-row': 'Which rows an item spans — same <code>start / end</code> syntax as <code>grid-column</code>.',

        // ---- Positioning ----
        'position': 'How the element is placed. <code>static</code> (default) flows normally; <code>relative</code> offsets from its normal spot; <code>absolute</code> is pulled from flow and placed vs the nearest positioned ancestor; <code>fixed</code> vs the viewport (stays on scroll); <code>sticky</code> acts relative until you scroll past a threshold, then sticks.',
        'top': 'Offset edge. For <code>relative</code>, shifts from the normal position; for <code>absolute</code>/<code>fixed</code>, sets distance from the containing block’s top edge. Blank = <code>auto</code>.',
        'right': 'Offset from the right edge — same rules as <code>top</code>. Blank = <code>auto</code>.',
        'bottom': 'Offset from the bottom edge — same rules as <code>top</code>. Blank = <code>auto</code>.',
        'left': 'Offset from the left edge — same rules as <code>top</code>. Blank = <code>auto</code>.',
        'z-index': 'Stacking order, <b>only for positioned elements</b> (not <code>static</code>). Higher numbers paint on top of lower ones, and a set value creates a stacking context that traps its descendants.',
    };

    const tip = document.createElement('div');
    tip.className = 'info-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    let pinned = null;

    function pageKey() { return document.body.dataset.page || ''; }

    function lookup(prop) {
        return EXPLAIN[pageKey() + ':' + prop] || EXPLAIN[prop] || null;
    }

    function leadingText(label) {
        for (let i = 0; i < label.childNodes.length; i++) {
            const n = label.childNodes[i];
            if (n.nodeType === 3 && n.textContent.trim()) return n;
        }
        return null;
    }

    function setupLabel(label) {
        const textNode = leadingText(label);
        if (!textNode) return;
        const prop = textNode.textContent.trim().toLowerCase();
        const html = lookup(prop);
        if (!html) return;

        // group the name + icon so they stay together inside the flex label
        const group = document.createElement('span');
        group.className = 'info-group';
        label.insertBefore(group, textNode);
        group.appendChild(textNode);

        const icon = document.createElement('button');
        icon.type = 'button';
        icon.className = 'info-icon';
        icon.setAttribute('aria-label', 'Explain ' + prop);
        icon.innerHTML = '<span aria-hidden="true">i</span>';
        group.appendChild(icon);

        icon.addEventListener('mouseenter', function () { show(icon, html); });
        icon.addEventListener('mouseleave', function () { if (pinned !== icon) hide(); });
        icon.addEventListener('focus', function () { show(icon, html); });
        icon.addEventListener('blur', function () { if (pinned !== icon) hide(); });
        icon.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (pinned === icon) hide(); else { pinned = icon; show(icon, html); }
        });
    }

    function show(icon, html) {
        tip.innerHTML = html;
        tip.hidden = false;
        position(icon);
    }
    function hide() { tip.hidden = true; pinned = null; }

    function position(icon) {
        const r = icon.getBoundingClientRect();
        tip.style.left = tip.style.top = '';
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        let left = r.left + r.width / 2 - tw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        let top = r.bottom + 8;
        if (top + th > window.innerHeight - 8) top = r.top - th - 8;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    function init() {
        document.body.appendChild(tip);
        Array.prototype.forEach.call(document.querySelectorAll('.controls__label'), setupLabel);
        document.addEventListener('click', function (e) {
            if (pinned && !e.target.closest('.info-icon')) hide();
        });
        window.addEventListener('scroll', function () { if (pinned) position(pinned); }, true);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
