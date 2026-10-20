import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['./src/cli.ts'],
	format: ['esm'],
	dts: false,
	bundle: true,
	clean: false,
	minify: false,
	sourcemap: false,
	splitting: false,
	tsconfig: './tsconfig.json',
	external: ['commander', '@qr-render/core'],
	name: 'qrx',
	banner: {
		js: '#!/usr/bin/env node',
	},
})
