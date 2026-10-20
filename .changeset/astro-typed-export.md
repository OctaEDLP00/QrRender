---
'@qr-render/web': patch
---

`./astro` ahora exporta un componente **tipado** (`dist/astro.mjs` + `astro.d.mts`) que transmite el `QrCode.astro` compilado por el consumidor, para seguir interpretando correctamente `.astro` de Astro, además del named `QrCode` para la corriente principal. El import del `.astro` queda externalizado (`neverBundle /\.\astro\$/`), `QrCode.astro` se copia a `dist/astro/` (autónomo: visualizaciones inline) y el peer de astro se fija como rango `^7.0.0`.
