// ============================================================
// Shared sidebar — single source of truth for the menu.
//
// Rendered by JS (instead of duplicated HTML on every page, or a
// fetch()-based include) so it works even when the page is opened
// directly via file://, where fetch() is blocked by the browser.
//
// Each page declares two data-attributes on <body>:
//   data-root  – path prefix back to the project root
//                ('' on pages at the root, '../' one level deep, etc.)
//   data-page  – the key of the menu item that is active on this page
//
// To add a new learning page: add an entry to NAV below and create
// the page (see README). That's the only menu change needed.
// ============================================================
(function () {
    'use strict';

    var BRAND = '📚 Learn Frontend';

    // href is relative to the PROJECT ROOT. data-root on <body> makes
    // it resolve correctly from any page depth.
    var NAV = [
        { key: 'home', label: 'Home', href: 'index.html' },
        { key: 'flex', label: 'Learn CSS Flex', href: 'pages/flexbox.html' },
        { key: 'grid', label: 'Learn CSS Grid', href: 'pages/grid.html' },
    ];

    var mount = document.querySelector('[data-sidebar]');
    if (!mount) return;

    var root = document.body.dataset.root || '';
    var current = document.body.dataset.page || '';

    var links = NAV.map(function (item) {
        var cls = 'sidebar__link' + (item.key === current ? ' is-active' : '');
        return (
            '<li>' +
            '<a class="' + cls + '" href="' + root + item.href + '">' +
            item.label +
            '</a>' +
            '</li>'
        );
    }).join('');

    mount.innerHTML =
        '<div class="sidebar__brand">' + BRAND + '</div>' +
        '<ul class="sidebar__nav">' + links + '</ul>';
})();
