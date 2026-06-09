# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Mendix Web Application** (`AxWebApp.mpr`) built on **Mendix Studio Pro 10.24.9** (Beta). It uses the Atlas UI framework with a custom Ant Design-inspired theme layer. The project is developed by the `mendix-one` team.

**Runtime:** Mendix 10.24.9 · Java 21 · Gradle build · SCSS theming · Rollup JS bundling

## Build & Run Commands

All builds are driven by Mendix Studio Pro. Gradle handles Java compilation and deployment packaging.

```bash
# Compile Java actions
cd deployment && ./gradlew compile

# Full deployment (copy libs, resources, templates)
cd deployment && ./gradlew deploy

# Package into JAR
cd deployment && ./gradlew package

# Clean deployment output
cd deployment && ./gradlew clean
```

**Running locally:** Launch via Studio Pro or Eclipse using `ax_web_app.launch`. The app runs on `http://localhost:8080/`, admin on `8090`. SCSS and JS bundling are handled automatically by Studio Pro on deploy.

## Architecture

### Business Modules (custom `ax*` modules)

| Module | Purpose |
|--------|---------|
| `axauth` | Authentication — sign-in flow, account management, JS redirect action |
| `axadmin` | Admin pages (AdminPage, OqlTestPage) |
| `axhome` | Home page and navigation |
| `axui` | **Design system** — Ant Design re-skin, Roboto font, Material Icons, layout helpers |
| `axchatbot` | Chatbot (theme-only) |
| `axsimulation` | Simulation module with dedicated widget |

### Custom Pluggable Widgets

Source code is **not** in this repo — only pre-built `.mpk` packages in `widgets/`. The custom widgets are:

- `one.mendix.AxAppLayout` — Main app shell/layout
- `one.mendix.AxDisplayPanel` — Display panel
- `one.mendix.AxLogin` / `one.mendix.AxSignin` — Login and sign-in flows
- `one.mendix.AxSimulation` — Simulation widget

### Key Directories

| Path | What it holds |
|------|---------------|
| `javasource/<module>/` | Java actions — only code between `BEGIN USER CODE` / `END USER CODE` markers survives regeneration |
| `javascriptsource/<module>/actions/` | JavaScript nanoflow actions (same marker pattern) |
| `themesource/<module>/web/` | Per-module SCSS overrides and design properties |
| `theme/web/` | Global theme variables and login pages |
| `widgets/` | Pre-built widget `.mpk` packages |
| `userlib/` / `vendorlib/` | Java JARs (project and third-party) |
| `deployment/` | Auto-generated build output (gitignored) |

### Theming Architecture (3 layers)

1. **Global variables** — `theme/web/custom-variables.scss` — Brand colors (`$brand-primary: #264ae5`), topbar (`#020557`), sidebar (`#24276c`), typography (Open Sans), spacing, breakpoints
2. **Module overrides** — `themesource/axui/web/` — The core design system:
   - `main.scss` — Import chain: custom-variables → ant-overrides → roboto → icons → ax
   - `_ant-overrides.scss` — Ant Design re-skin (control heights 28px, focus rings, Data Grid 2 styling)
   - `_ax.scss` — Layout classes (`.ax-app`, `.ax-page`, `.ax-modal`, `.ax-info-table`)
   - `_ax-roboto.scss` / `_ax-icons.scss` — Font declarations
3. **Compiled output** — `theme-cache/web/theme.compiled.css`

## Conventions

- **Java code preservation:** Only code between `// BEGIN USER CODE` and `// END USER CODE` (or `BEGIN EXTRA CODE` / `END EXTRA CODE`) is retained when Studio Pro regenerates files. Never edit outside these markers.
- **Auto-generated proxies:** `javasource/*/proxies/` directories are auto-generated and gitignored — do not edit.
- **Widget development:** Custom widget source lives in separate repos. This project only consumes `.mpk` packages.
- **SCSS changes:** Edit `theme/web/custom-variables.scss` for global tokens, then `themesource/<module>/web/main.scss` for module-specific styles. Studio Pro recompiles on deploy.
- **No standalone npm/Node build:** There is no `package.json`. JS bundling and SCSS compilation are managed by Studio Pro's built-in Rollup and Sass toolchain.

## User Roles

Three roles: **Administrator** (full access), **User** (standard), **Anonymous** (unauthenticated).

## Third-Party Dependencies

Notable vendor libs: Apache POI (Excel), PDFBox, Guava, Commons (IO, Lang, Text), Jackson. Marketplace modules: CommunityCommons, DataWidgets (Data Grid 2), NanoflowCommons, ExcelImporter, XLSReport, OQL, MxModelReflection.
