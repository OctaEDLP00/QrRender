# AGENTS.md

Guidance for AI agents working in this repo. Verified against configs/CI, not prose.

pnpm 12 workspace (`packages/*`), Node >= 20 (CI runs 22), always install with `pnpm`.
Toolchain: tsdown (Rolldown) + TypeScript 7 for builds, Vitest + happy-dom for tests,
oxlint + oxfmt for lint/format. Deps are hoisted at the root: tool bins live in the root
`node_modules` and packages only declare runtime deps.

| Path | What it is |
| ---- | ---------- |
| `packages/core` | `@qr-render/core` — zero-dep QR engine (matrix, masking, Reed–Solomon V1–40) |
| `packages/web` | `@qr-render/web` — Canvas renderer (ESM entries + Preact/Svelte/Astro wrappers + self-contained IIFE) |
| `packages/cli` | `@qr-render/cli` — `qr` bin (commander): ANSI terminal QR, zero-dep PNG/SVG |
| `docs` | Vanilla docs + playground, at repo root (outside `packages/`) |

## Commands

```bash
pnpm build          # core → web → cli (topological)
pnpm test:run       # every package, one pass — use this, NOT pnpm test
pnpm lint           # oxlint per package (lint:fix to autofix)
pnpm fmt:check      # oxfmt check (pnpm fmt to write)
pnpm type-check     # per package; add pnpm docs:type-check for docs/
pnpm docs:build     # Vite + Shiki build of the docs site → docs/dist
```

- `pnpm test` is Vitest **watch mode**; prefer `test:run` (what CI and pre-commit run).
- CI order: `pnpm install --frozen-lockfile` → build → `test:run` → lint → `fmt:check` →
  type-check + `docs:type-check` → `docs:build`. All of it must pass before pushing.
- One package: `pnpm --filter @qr-render/web <script>`.
- Single test: from inside the package, `pnpm test:run test/core/QRCodeModel.test.ts`
  (args pass through to `vitest run`).

## Architecture quirks

- `@qr-render/core` stays **external** in the ESM builds of web/cli (single source of truth).
  Only web's IIFE build inlines it → `dist/index.browser.js` with the global `QRCode`.
- No build needed before testing or running docs:
  - web/cli tests resolve `@qr-render/core` against the core **source** (alias in each
    `vitest.config.ts`).
  - The docs playground imports `packages/web/src/index.ts` directly and Vite transpiles
    on the fly (dev server too — `pnpm docs` works without a build).
- `@qr-render/web` serves framework wrappers as subpaths (`./preact`, `./svelte`, `./astro`,
  `./element`); raw `.svelte`/`.astro` sources are copied into `dist/` and compiled by the
  consuming project. Don't break the `exports` map or the `copy` step in `tsdown.config.ts`.
- `QrErrorCorrectLevel` follows the ISO format-info convention (`M=0, L=1, H=2, Q=3`) —
  deliberately not the alphabetical order of some legacy libraries.
- web tests use `vitest-canvas-mock` (see `packages/web/test/setup.ts`).
- Sections of `README.md` about docs are stale (`docs/js/qr.browser.js` copy flow,
  `tools/build-docs.mjs`): trust `vite.config.ts` and `.github/workflows/` instead.

## Commits, checks, release

- **Every `git commit` runs `pnpm build && pnpm test:run` on the whole workspace** (husky
  pre-commit, intentionally slow). Fix the failure locally; don't bypass the hook.
- Conventional Commits enforced (commit-msg hook + PR workflow). Allowed scopes:
  `core | web | cli | docs | deps | repo | ci | release`, header ≤ 100 chars. Commit
  subjects are written in Spanish (house style).
- Releases are changeset-driven: run `pnpm changeset` and commit the generated file with
  your change. Never bump package versions by hand — `release.yml` opens a
  `chore: version packages` PR; merging it publishes to npm (`NPM_TOKEN`) and creates
  GitHub Releases.
- `.npmrc` sets `minimum-release-age=1440`: installing external packages published less
  than 24 h ago will fail. If a fresh dep doesn't resolve, this is why.
- Docs deploy: `pages.yml` builds with `VITE_BASE=/QrRender/` (served under a subpath).

## `.agents/` — installed agent skills

`.agents/skills/` holds 12 vendored agent skills (folder with `SKILL.md` plus optional
`references/`), installed from public registries and pinned in the root
**`skills-lock.json`** (per-skill `source` + content hash). OpenCode auto-discovers them.

- Load the matching skill before touching related code: `vite`/`vitest` for Vite 8 +
  Vitest 5 config, `svelte5-best-practices` and `svelte-code-writer` for
  `packages/web/src/svelte/`, `astro` for the Astro wrapper, `oxlint` for lint config,
  `typescript-advanced-types` for core types, `accessibility`/`seo`/`frontend-design` for
  the docs site.
- Inventory: accessibility, astro, frontend-design, nodejs-backend-patterns,
  nodejs-best-practices, oxlint, seo, svelte-code-writer, svelte5-best-practices,
  typescript-advanced-types, vite, vitest.
- Treat `.agents/skills/` as vendored/locked content: update through the installer that
  maintains `skills-lock.json`, not by hand-editing (hashes are pinned per skill).
