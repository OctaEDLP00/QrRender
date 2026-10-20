# QrRender

Monorepo multi-paquete (pnpm workspaces) para la suite `@qr-render`:

| Paquete                            | Descripción                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [`@qr-render/core`](packages/core) | Motor agnóstico: generación de la matriz QR, masking y corrección de error Reed-Solomon. Cero dependencias. |
| [`@qr-render/web`](packages/web)   | Renderer HTML5 Canvas para el navegador (usa `@qr-render/core`).                                            |
| [`@qr-render/cli`](packages/cli)   | Comando `qr` para generar códigos QR en la terminal con salida ANSI (usa `@qr-render/core`).                |

Antes de este monorepo la lógica central (`core`, `libs`, `types`) estaba **duplicada** entre los
repos `QrCode` (web) y `QrCodeCLI`. Aquí se centraliza en un único paquete core, y tanto la web como
el CLI solo contienen su renderer y su I/O.

## Estructura

```
.
├── .vscode/
├── .github/workflows/ci.yml
├── docs/            Documentación vanilla (HTML/CSS/JS) + playground de @qr-render/web
├── tools/           build-docs.mjs (Shiki) y serve-docs.mjs (servidor estático, cero deps)
└── packages/
    ├── core/   @qr-render/core  (motor compartido, V1–40)
    ├── web/    @qr-render/web   (CanvasDrawing + clase QRCode)
    └── cli/    @qr-render/cli   (ConsoleDrawing + bin `qr` con commander)
```

## Docs (vanilla)

La documentación vive en `docs/` fuera de `packages/`, hecha solo con HTML, CSS y JS:

- El **playground** ejecuta la librería real cargando `packages/web/dist/index.browser.js` (build
  IIFE que inlina el core) y permite probar todas las opciones + descargar el PNG y el SVG
  (con la misma malla snapeada del Canvas). `makeCode()` auto-selecciona la versión 1–40
  classic-style y expone el modelo via `qr.model` para construir salidas externas.
- El código se resalta con **Shiki en build-time** (tema `github-dark`): el autor edita
  `docs/src/index.html` y `pnpm docs:build` genera `docs/index.html`. Sin CDN ni JS de resaltado en
  runtime.
- **Web components propios** para las pestañas de la docs (`qr-tabs` / `qr-tab-item`, estilo
  Starlight): fuentes TS en `docs/src/components/tabs/` con shadow DOM, ARIA completa
  (roving tabindex, flechas), sincronización por `sync-key` con persistencia en `localStorage` y
  registro global protegido. `docs:build` las transpila con esbuild a `docs/js/components.js`.
- Servidor estático cero dependencias incluido:

```bash
pnpm build    # necesario al menos una vez (genera la IIFE que usa la doc)
pnpm docs     # build Shiki + servidor en http://localhost:5173
```

## Desarrollo

Requisitos: Node >= 20 y pnpm >= 10.

```bash
pnpm install

pnpm build        # construye core → web → cli (orden topológico)
pnpm test:run     # tests de todos los paquetes
pnpm lint && pnpm fmt
pnpm type-check
```

Prueba el CLI localmente:

```bash
pnpm build && node packages/cli/dist/cli.js "Hola mundo"
```

## Decisiones de arquitectura

- **Core como dependencia externa**: `@qr-render/web` (build ESM) y `@qr-render/cli` dependen de
  `@qr-render/core` vía `workspace:*`; el build los deja como externos para no duplicar el motor y
  poder versionarlo aparte. Solo el build IIFE de la web lo inlinea para dar un bundle autocontenido
  en `<script>`.
- **Tabla RS completa V1–40**: el core ahora soporta todas las versiones estándar (antes solo
  V1–10).
- **`QrErrorCorrectLevel` unificado** según la convención ISO del format info
  (`M=0, L=1, H=2, Q=3`), corrigiendo el mapeo desplazado del paquete CLI standalone.
- En desarrollo, los tests de `web` y `cli` resuelven `@qr-render/core` directamente contra el
  **fuente** del core (alias en `vitest.config.ts` + `paths` en `tsconfig.json`), así no necesitas
  build previo.

## Tooling

- Builds con `tsup`, tests con `vitest`, lint con `oxlint`, formato con `oxfmt`.
- **Config única en la raíz**: `.oxlintrc.json` y `.oxfmtrc.json` viven en la raíz del monorepo;
  oxlint/oxfmt los descubren hacia arriba desde cada paquete, así que los reglas de lint/formato son
  idénticas para los tres.
- **DevDependencies hoisted a la raíz**: oxfmt/oxlint/vitest/tsup/typescript no se repiten por
  paquete; cada paquete declara solo sus dependencias runtime (`commander`, `@qr-render/core`). pnpm
  expone el `node_modules/.bin` de la raíz a los scripts de los workspaces.
- CI única en `.github/workflows/ci.yml` (lint, fmt, test, build por paquete).
- Cada paquete mantiene sus scripts de release (`release.bash` / `release.ps1`) para publicar en npm
  con `pnpm publish`.

## Roadmap

- Issue original del CLI:
  [`--output` para guardar el QR como PNG/SVG/JPG](https://github.com/OctaEDLP00/QrCodeCLI/issues/1).
  Decisión: encoder **cero dependencias** (PNG vía `node:zlib`, SVG a texto); JPG queda fuera salvo
  que se decida añadir una dependencia de encoding.
- Visor de QR en terminal con componente propio (`ink-picture` / `terminal-image`).

## License

MIT © [OctaEDLP00](https://github.com/OctaEDLP00). Implementación basada en las librerías clásicas
`qrcode-generator` (Kazuhiko Arase) y `qrcodejs` (davidshimjs), ambas MIT.
