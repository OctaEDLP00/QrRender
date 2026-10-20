import { defineConfig } from 'tsdown'

export default defineConfig([
	// ESM: @qr-render/core queda como dependencia externa (tree-shakable y sin duplicación)
	{
		entry: ['./src/index.ts'],
		format: ['esm'],
		dts: true,
		clean: true,
		minify: true,
		sourcemap: true,
		tsconfig: './tsconfig.json',
		deps: {
			neverBundle: ['@qr-render/core'],
		},
		outExtensions() {
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
		platform: 'browser',
		clean: false,
		minify: true,
		sourcemap: true,
		tsconfig: './tsconfig.json',
		deps: {
			alwaysBundle: ['@qr-render/core'],
		},
		outExtensions() {
			return {
				js: '.browser.js',
			}
		},
		// Fija el nombre exacto sin el prefijo `.iife` que tsdown inserta por
		// defecto: la docs y el bundle servido esperan `index.browser.js`.
		outputOptions: {
			entryFileNames: '[name].browser.js',
		},
		// El IIFE envuelve el default export en un namespace ESM; el global
		// `<script>` debe exponer directamente la clase QRCode.
		footer: {
			js: "if (typeof window !== 'undefined' && typeof QRCode === 'object' && QRCode.default) { QRCode = QRCode.default; window.QRCode = QRCode; }",
		},
	},
])
