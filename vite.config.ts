// Vite 8 (rolldown). Docs de la suite: dev + build estático para GitHub Pages.
// `pnpm docs` (dev), `pnpm docs:build` → docs/dist (deploy de Pages).
import { defineConfig } from 'vite'
import { shikiHighlight } from './tools/vite-shiki.mjs'

export default defineConfig({
	// La web vive en docs/: index.html de docs/ es la entrada Vite.
	root: 'docs',

	// Pages sirve el repo bajo /QrRender/: en CI el workflow exporta VITE_BASE.
	// Sin la variable (desarrollo local) la base es '/'.
	base: process.env.VITE_BASE || '/',

	// El playground importe la fuente de @qr-render/web, que a su vez importa
	// @qr-render/core. Alias a la fuente del core (igual que los vitest.config
	// (de cada paquete): resuelve sin depender del shape del install de CI.
	resolve: {
		alias: {
			'@qr-render/core': new URL('./packages/core/src/index.ts', import.meta.url).pathname,
		},
	},

	plugins: [shikiHighlight()],

	// Resuelto relativo al root (docs/) → docs/dist.
	build: {
		outDir: 'dist',
	},
})
