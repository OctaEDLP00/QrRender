# QrRender

English · [Español](README.es,md)

Multi-package monorepo (pnpm workspaces) for the `@qr-render` suite:

| Package                            | Description                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`@qr-render/core`](packages/core) | Agnostic engine: QR matrix generation, masking and Reed–Solomon error correction. Zero deps.   |
| [`@qr-render/web`](packages/web)   | HTML5 Canvas renderer for the browser (uses `@qr-render/core`).                                |
| [`@qr-render/cli`](packages/cli)   | `qr` command to build QR codes in the terminal with ANSI output (uses `@qr-render/core`).       |

Before this monorepo, the core logic (`core`, `libs`, `types`) was **duplicated** between the
`QrCode` (web) and `QrCodeCLI` repositories. Here it is centralized in a single core package, and
both the web and the CLI only contain their renderer and their I/O.

## Structure

```
.
├── .vscode/
├── .github/workflows/ci.yml
├── docs/            Vanilla docs (HTML/CSS/JS) + @qr-render/web playground
├── tools/           build-docs.mjs (Shiki) and serve-docs.mjs (static server, zero deps)
└── packages/
    ├── core/   @qr-render/core  (shared engine, V1–40)
    ├── web/    @qr-render/web   (CanvasDrawing + QRCode class)
    └── cli/    @qr-render/cli   (ConsoleDrawing + `qr` bin with commander)
```

## Docs (vanilla)

The documentation lives in `docs/`, outside `packages/`, built with plain HTML, CSS and JS:

- The **playground** runs the real library by loading `docs/js/qr.browser.js` (a copy of the
  `@qr-render/web` IIFE build that inlines the core) and lets you try every option + download the
  PNG and SVG (with the same snapped grid as the Canvas). `makeCode()` auto-selects the version
  1–40 classic-style and exposes the model via `qr.model` to build external outputs.
- Code is highlighted with **Shiki at build time** (`github-dark` theme): you edit
  `docs/src/index.html` and `pnpm docs:build` generates `docs/index.html`. No CDN and no
  highlight JS at runtime.
- **Custom web components** for the docs tabs (`qr-tabs` / `qr-tab-item`, Starlight-style): TS
  sources in `docs/src/components/tabs/` with shadow DOM, full ARIA (roving tabindex, arrows),
  `sync-key` synchronization with `localStorage` persistence and a guarded global registry.
  `docs:build` transpiles them with esbuild to `docs/js/components.js`.
- Zero-dependency static server included:

```bash
pnpm build    # needed at least once (generates the IIFE the docs use)
pnpm docs     # Shiki build + server at http://localhost:5173
```

## Development

Requirements: Node >= 20 and pnpm >= 10.

```bash
pnpm install

pnpm build        # builds core → web → cli (topological order)
pnpm test:run     # tests for every package
pnpm lint && pnpm fmt
pnpm type-check
```

Try the CLI locally:

```bash
pnpm build && node packages/cli/dist/cli.js "Hello world"
```

## Architecture decisions

- **Core as an external dependency**: `@qr-render/web` (ESM build) and `@qr-render/cli` depend on
  `@qr-render/core` through `workspace:*`; the build keeps them external so the engine is neither
  duplicated nor versioned apart. Only the web's IIFE build inlines it to provide a self-contained
  bundle for `<script>` tags.
- **Full RS table V1–40**: the core now supports every standard version (before it was V1–10
  only).
- **Unified `QrErrorCorrectLevel`** following the ISO convention of the format info
  (`M=0, L=1, H=2, Q=3`), fixing the shifted mapping of the standalone CLI package.
- During development, `web` and `cli` tests resolve `@qr-render/core` directly against the core
  **source** (alias in `vitest.config.ts` + `paths` in `tsconfig.json`), so no prior build is
  needed.

## Tooling

- Builds with `tsdown` (Rolldown; dts via `rolldown-plugin-dts` with native TypeScript 7), tests
  with `vitest`, lint with `oxlint`, formatting with `oxfmt`.
- **Single config at the root**: `.oxlintrc.json` and `.oxfmtrc.json` live at the monorepo root;
  oxlint/oxfmt discover them upward from each package, so lint/format rules are identical for all
  three.
- **DevDependencies hoisted to the root**: oxfmt/oxlint/vitest/tsdown/typescript do not repeat per
  package; each package only declares its runtime dependencies (`commander`, `@qr-render/core`).
  pnpm exposes the root `node_modules/.bin` to the workspace scripts.
- CI in `.github/workflows/ci.yml` (lint, fmt, test, build, type-check per package + docs).
- **Release with Changesets**: `pnpm changeset` generates the bump → `.github/workflows/release.yml`
  (`changesets/action`) accumulates the pending changesets in a "chore: version packages" PR and,
  when merged, publishes `@qr-render/*` to npm (requires the `NPM_TOKEN` secret). `changeset publish`
  creates the `@qr-render/<package>@<version>` tags and the workflow itself opens a **GitHub
  Release** per tag (`.github/scripts/create-github-releases.mjs`), with notes taken from each
  package's `CHANGELOG.md`; it is idempotent and can also be run manually with
  `workflow_dispatch`.
- Commit discipline: Conventional Commits with `husky` (`pre-commit` and `commit-msg` hooks) +
  `commitlint`; PRs are additionally validated by `.github/workflows/commitlint.yml`, and
  Dependabot refreshes npm and GitHub Actions dependencies weekly.

## Roadmap

- Original CLI issue:
  [`--output` to save the QR as PNG/SVG/JPG](https://github.com/OctaEDLP00/QrCodeCLI/issues/1).
  Decision: **zero-dependency** encoder (PNG via `node:zlib`, SVG as text); JPG stays out unless a
  dependency is accepted.
- QR viewer in the terminal with a component of our own (`ink-picture` / `terminal-image`).

## License

MIT © [OctaEDLP00](https://github.com/OctaEDLP00). Implementation based on the classic libraries
`qrcode-generator` (Kazuhiko Arase) and `qrcodejs` (davidshimjs), both MIT.
