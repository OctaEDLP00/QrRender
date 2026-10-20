import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['./src/cli.ts'],
	format: ['esm'],
	dts: false,
	clean: false,
	minify: false,
	sourcemap: false,
	platform: 'node',
	tsconfig: './tsconfig.json',
	deps: {
		// commander y @qr-render/core quedan externos (dependencias del paquete).
		neverBundle: ['commander', '@qr-render/core'],
	},
	outExtensions() {
		// dist/cli.js exacto: es lo que apunta el campo `bin` del paquete.
		return {
			js: '.js',
		}
	},
	banner: {
		// Shebang que tsup ponía igual: `qr` es un bin de Node.
		js: '#!/usr/bin/env node',
	},
})
