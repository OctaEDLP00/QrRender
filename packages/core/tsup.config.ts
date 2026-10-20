import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['./src/index.ts'],
	format: ['esm'],
	dts: true,
	bundle: true,
	clean: true,
	minify: true,
	sourcemap: true,
	splitting: false,
	tsconfig: './tsconfig.json',
	outExtension() {
		return {
			js: '.mjs',
		}
	},
})
