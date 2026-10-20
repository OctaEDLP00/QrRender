# @qr-render/web

## 0.2.1

### Patch Changes

- d9e6943: `./astro` ahora exporta un componente **tipado** (`dist/astro.mjs` + `astro.d.mts`) que
  transmite el `QrCode.astro` compilado por el consumidor, para seguir interpretando correctamente
  `.astro` de Astro, además del named `QrCode` para la corriente principal. El import del `.astro`
  queda externalizado (`neverBundle /\.\astro\$/`), `QrCode.astro` se copia a `dist/astro/`
  (autónomo: visualizaciones inline) y el peer de astro se fija como rango `^7.0.0`.

## 0.2.0

### Minor Changes

- 9af727d: Nuevas subpath exports con wrappers para frameworks: `@qr-render/web/preact` (componente
  Preact), `@qr-render/web/svelte` (componente Svelte 5, fuente `.svelte`), `@qr-render/web/astro`
  (componente de servidor Astro con SVG estático) y `@qr-render/web/element` (web component
  `<qr-code>` con shadow DOM). Además `@qr-render/web/qrSvg` expone el generador de SVG estático
  compartido. JSDoc de los tres paquetes traducida y completada al inglés.

## 0.1.1

### Patch Changes

- d63baf7: Cambio de `tsup` a `tsdown` (Rolldown) en el toolchain de build y migración del
  type-check a TypeScript 7 nativo. Sin cambios de API ni de comportamiento.
- Updated dependencies [d63baf7]
  - @qr-render/core@0.1.1
