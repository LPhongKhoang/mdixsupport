# Learn Frontend Styling

A small vanilla (HTML + SCSS + plain JS) app of interactive playgrounds for
learning frontend concepts by playing with them. No framework, no bundler —
only `sass` to compile the stylesheets.

## Run it

```bash
npm install          # first time only — installs the sass compiler
npm run build-css    # compile SCSS → CSS once
npm run watch-css    # …or recompile automatically as you edit .scss files
```

Then open `index.html` in a browser (double-click, or serve the folder —
both work; the sidebar is JS-rendered so it needs no server).

## Structure

```
index.html              Home page (sidebar + welcome)
pages/                  One HTML file per learning app
  flexbox.html            → Learn CSS Flex playground
  grid.html               → Learn CSS Grid playground
  positioning.html        → Learn CSS Positioning playground
scss/                   Stylesheet sources (compiled to css/)
  style.scss              entry — @uses the partials below
  _variables.scss         design tokens (colors, sizes)
  _shell.scss             shared app shell: sidebar + main
  _flexbox.scss           flex playground styles (+ shared .controls)
  _toolbar.scss           shared toolbar + challenges card styles
  _grid.scss              grid playground styles
  _positioning.scss       positioning playground styles
css/                    Compiled output (committed) + source maps
js/
  sidebar.js            shared sidebar (single source of truth for the menu)
  flexbox.js            flex playground logic
  grid.js               grid playground logic
  positioning.js        positioning playground logic
```

## The app shell

Every page is a full HTML document with the same shell:

```html
<body data-root="../" data-page="flex">
  <div class="app">
    <aside class="sidebar" data-sidebar></aside>   <!-- filled by sidebar.js -->
    <main class="main"> …page content… </main>
  </div>
  <script src="../js/sidebar.js"></script>
</body>
```

`sidebar.js` renders the menu into `[data-sidebar]`. It reads two attributes
on `<body>`:

- `data-root` — path prefix back to the project root. `""` for pages at the
  root (like `index.html`), `"../"` for pages one level deep (in `pages/`),
  `"../../"` two levels deep, and so on. This is what makes links resolve
  correctly from any depth, including when opened via `file://`.
- `data-page` — the `key` of the menu item to mark active on this page.

## Adding a new learning page

1. **Create the page** — copy `pages/flexbox.html` as a starting point and
   save it as, e.g., `pages/grid.html`. Set the two body attributes:

   ```html
   <body data-root="../" data-page="grid">
   ```

   Replace the `<main>` content with your new playground.

2. **Register it in the menu** — add one entry to the `NAV` array in
   `js/sidebar.js`:

   ```js
   var NAV = [
       { key: 'home',  label: 'Home',            href: 'index.html' },
       { key: 'flex',  label: 'Learn CSS Flex',  href: 'pages/flexbox.html' },
       { key: 'grid',  label: 'Learn CSS Grid',  href: 'pages/grid.html' }, // new
   ];
   ```

   The `key` must match the new page's `data-page`; the `href` is relative
   to the project root (sidebar.js combines it with each page's `data-root`).

3. **(Optional) add styles** — create a `scss/_grid.scss` partial, `@use` it
   from `scss/style.scss`, then run `npm run build-css`.

4. **Add interactivity** — put the page's JS in `js/grid.js` and include it
   from the page (see how `flexbox.html` includes `flexbox.js`).

That's it — the new item appears in the sidebar on every page automatically.

## Notes

- Compiled CSS (`css/*.css`) is committed alongside the SCSS sources, so the
  app works without a build step. Re-run `npm run build-css` after editing
  SCSS.
- The flex playground: change any property in the left panel to see the
  colored boxes (and the generated CSS on the right) update live. Click a box
  to edit its per-item properties.
