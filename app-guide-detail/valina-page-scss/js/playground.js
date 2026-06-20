// ============================================================
// Shared playground engine.
//
// Owns everything that's identical across the playgrounds:
//   • Free Play / Challenges mode + the challenges card UI
//   • solved tracking + progress/status text
//   • toolbar wiring: mode toggle, presets, reset, prev/next
//   • the copy button (with file:// fallback)
//
// Each playground supplies its unique behaviour via a config object:
//   challenges    [{ title, goal, target: [...] }]
//   isSatisfied(targetEntry) -> boolean
//   apply()       apply current controls to the preview + render code
//                 (must NOT check challenges — the engine does that)
//   reset()       reset state to defaults (must NOT apply)
//   applyPreset(name)  apply a preset's values + apply (must NOT check)
//   loadChallenge?(challenge)  optional per-challenge setup after reset
//
// Loaded as a plain <script> before the page's playground script, so it
// works on file:// (no modules / fetch).
// ============================================================
(function () {
    'use strict';

    window.createPlayground = function (cfg) {
        const cardEl = document.getElementById('challengeCard');
        const progressEl = document.getElementById('challengeProgress');
        const statusEl = document.getElementById('challengeStatus');
        const titleEl = document.getElementById('challengeTitle');
        const goalEl = document.getElementById('challengeGoal');
        const prevBtn = document.getElementById('prevChallenge');
        const nextBtn = document.getElementById('nextChallenge');
        const modeBtns = Array.from(document.querySelectorAll('[data-mode]'));
        const presetBtns = Array.from(document.querySelectorAll('[data-preset]'));
        const resetBtn = document.getElementById('resetBtn');
        const copyBtn = document.getElementById('copyCode');
        const codeEl = document.getElementById('cssCode');

        let mode = 'free';
        let challengeIndex = 0;
        const solvedSet = new Set();

        function check() {
            if (mode !== 'challenge') return;
            const ch = cfg.challenges[challengeIndex];
            const target = Array.isArray(ch.target) ? ch.target : [ch.target];
            const remaining = target.filter(function (t) { return !cfg.isSatisfied(t); });
            const solved = remaining.length === 0;
            if (solved) solvedSet.add(challengeIndex);
            if (statusEl) {
                statusEl.textContent = solved
                    ? '✓ Solved!'
                    : remaining.length + ' propert' + (remaining.length === 1 ? 'y' : 'ies') + ' to go';
                statusEl.classList.toggle('is-solved', solved);
            }
            if (cardEl) cardEl.classList.toggle('is-solved', solved);
            if (progressEl) {
                progressEl.textContent =
                    'Challenge ' + (challengeIndex + 1) + ' / ' + cfg.challenges.length +
                    '  ·  Solved ' + solvedSet.size + '/' + cfg.challenges.length;
            }
        }

        function showChallenge(i) {
            challengeIndex = Math.max(0, Math.min(i, cfg.challenges.length - 1));
            const ch = cfg.challenges[challengeIndex];
            if (typeof cfg.reset === 'function') cfg.reset();
            if (typeof cfg.loadChallenge === 'function') cfg.loadChallenge(ch);
            if (typeof cfg.apply === 'function') cfg.apply();
            if (titleEl) titleEl.textContent = 'Challenge ' + (challengeIndex + 1) + ': ' + ch.title;
            if (goalEl) goalEl.textContent = ch.goal;
            check();
        }

        function setMode(m) {
            mode = m;
            modeBtns.forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === m); });
            if (cardEl) cardEl.hidden = (m !== 'challenge');
            if (m === 'challenge') showChallenge(challengeIndex);
        }

        // ---- copy (with file:// fallback) ----
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

        // ---- wire toolbar ----
        modeBtns.forEach(function (b) {
            b.addEventListener('click', function () { setMode(b.dataset.mode); });
        });
        presetBtns.forEach(function (b) {
            b.addEventListener('click', function () {
                if (typeof cfg.applyPreset === 'function') cfg.applyPreset(b.dataset.preset);
                check();
            });
        });
        if (resetBtn) resetBtn.addEventListener('click', function () {
            if (typeof cfg.reset === 'function') cfg.reset();
            if (typeof cfg.apply === 'function') cfg.apply();
            check();
        });
        if (prevBtn) prevBtn.addEventListener('click', function () { showChallenge(challengeIndex - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { showChallenge(challengeIndex + 1); });
        if (copyBtn) copyBtn.addEventListener('click', function () {
            copyText(codeEl ? codeEl.textContent : '').then(function () {
                const orig = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(function () { copyBtn.textContent = orig; }, 1200);
            });
        });

        // ---- init (free mode) ----
        if (typeof cfg.reset === 'function') cfg.reset();
        if (typeof cfg.apply === 'function') cfg.apply();

        return { check: check, showChallenge: showChallenge, setMode: setMode };
    };
})();
