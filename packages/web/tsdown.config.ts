import { defineConfig } from 'tsdown'

export default defineConfig([
	// ESM: entrys de la librería + wrappers de frameworks; @qr-render/core y
	// preact quedan como dependencias externas (tree-shakable y sin duplicación).
	{
		entry: {
			index: './src/index.ts',
			qrSvg: './src/qrSvg.ts',
			element: './src/element.ts',
			preact: './src/preact/index.tsx',
			astro: './src/astro/Astro.ts',
		},
		format: ['esm'],
		dts: true,
		clean: true,
		minify: true,
		sourcemap: true,
		inputOptions: {
			transform: {
				// Runtime automático de Preact: emite `preact/jsx-runtime`.
				jsx: { runtime: 'automatic', importSource: 'preact' },
			},
		},
		platform: 'neutral',
		tsconfig: './tsconfig.json',
		deps: {
			neverBundle: [
				'@qr-render/core',
				'preact',
				'preact/hooks',
				// Los `.astro` los compila el proyecto consumidor (plugin astro de Vite);
				// quedan como import runtime hacia la copia en dist.
				/\.astro$/,
			],
		},
		outExtensions() {
			return {
				js: '.mjs',
			}
		},
		// Shipping de fuentes para los wrappers que compila el consumidor:
		// Svelte 5 (.svelte) y Astro (.astro). El .svelte.d.ts vuela como types
		// del subpath ./svelte.
		copy: [
			'./src/svelte/QRCode.svelte',
			'./src/svelte/QRCode.svelte.d.ts',
			// Sin flatten para conservar astro/QrCode.astro: el import runtime
			// rebasado de astro.mjs (`./astro/QrCode.astro`) resuelve así.
			{ from: './src/astro/QrCode.astro', flatten: false },
		],
		outDir: 'dist',
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
