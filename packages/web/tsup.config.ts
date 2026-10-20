import { defineConfig } from 'tsup'

export default defineConfig([
	// ESM: @qr-render/core queda como dependencia externa (tree-shakable y sin duplicación)
	{
		entry: ['./src/index.ts'],
		format: ['esm'],
		dts: true,
		bundle: true,
		clean: true,
		minify: true,
		sourcemap: true,
		splitting: false,
		tsconfig: './tsconfig.json',
		external: ['@qr-render/core'],
		outExtension() {
			return {
				js: '.mjs',
			}
		},
	},
	// IIFE: bundle autocontenido para <script> directo (incluye el core)
	{
		entry: ['./src/index.ts'],
		format: ['iife'],
		globalName: 'QRCode',
		bundle: true,
		clean: false,
		minify: true,
		sourcemap: true,
		splitting: false,
		tsconfig: './tsconfig.json',
		noExternal: ['@qr-render/core'],
		outExtension() {
			return {
				js: '.browser.js',
			}
		},
		// tsup envuelve el default export en un namespace ESM; el global `<script>`
		// debe exponer directamente la clase QRCode.
		footer: {
			js: "if (typeof window !== 'undefined' && typeof QRCode === 'object' && QRCode.default) { QRCode = QRCode.default; window.QRCode = QRCode; }",
		},
	},
])
