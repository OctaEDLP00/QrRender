---
'@qr-render/web': patch
---

Fix: el runtime del subpath `./astro` vuelve a apuntar al componente `.astro` crudo (`dist/astro/QrCode.astro`), no al wrapper `.mjs`. Un entry JS hace que Vite externalice el paquete en SSR y Node muera con `Unknown file extension ".astro"` al importar el `.astro` interno desde el `.mjs`. Con el `.astro` como entry Vite lo detecta como no-external y lo compila con su plugin. Los tipos siguen viniendo de `astro.d.mts` (`Component<QrCodeProps>`), y el default export mantiene la compatibilidad con 0.2.0.
