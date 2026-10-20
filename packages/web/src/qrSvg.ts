import { autoMakeModel } from './autoMake.js'
import type { QrErrorCorrectLevel } from '@qr-render/core'

/**
 * Options accepted by {@link qrSvg}. `size` is the edge of the square markup
 * in CSS pixels; everything else mirrors the Canvas options.
 */
export interface QrSvgOptions {
	/** Edge of the square in CSS pixels. @default 256 */
	size?: number
	/** Error correction level. @default 'H' */
	level?: keyof QrErrorCorrectLevel
	/** Dark module color. @default '#111827' */
	colorDark?: string
	/** Light module color. @default '#f8fafc' */
	colorLight?: string
	/** Physical margin in pixels. @default 10 */
	margin?: number
	/** Number of quiet-zone modules per side. @default 4 */
	quietZone?: number
	/** Extra classes for the `<svg>`. */
	class?: string
}

/**
 * Escapes XML-unsafe characters (`& < > " '`).
 */
const escapeXml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')

/**
 * Renders a QR code as a standalone SVG string. Static markup — no runtime —
 * ideal for Astro components (render-time), email templates and any place a
 * crisp, dependency-free vector result pays off.
 *
 * The matrix comes from the exact same pipeline as the Canvas renderer
 * (shared `autoMakeModel` with versions 1–40), but the modules are emitted as
 * whole `<rect>` tiles (like the CLI SVG export), not as the pixel-perfect
 * Canvas grid.
 * @param text Text to encode.
 * @param options Shape, colors and quiet zone.
 * @returns An `<svg …>…</svg>` string ready to be inlined.
 */
export const qrSvg = (text: string, options: QrSvgOptions = {}): string => {
	const {
		size = 256,
		level = 'H',
		colorDark = '#111827',
		colorLight = '#f8fafc',
		margin = 10,
		quietZone = 4,
	} = options

	const LEVELS: Record<string, QrErrorCorrectLevel> = { M: 0, L: 1, H: 2, Q: 3 }
	if (typeof LEVELS[level] !== 'number') {
		throw new Error(`Unknown error correction level "${level}" (expected L | M | Q | H)`)
	}

	const model = autoMakeModel(text, LEVELS[level])
	const moduleCount = model.getModuleCount()

	// The quiet zone is virtual modules; margin is physical pixels.
	const totalModules = moduleCount + quietZone * 2
	const usable = Math.max(1, size - margin * 2)
	// Whole module size keeps the edges crisp; the remainder is absorbed by margin.
	const scale = Math.max(1, Math.floor(usable / totalModules))
	const total = totalModules * scale + margin * 2
	const dark = escapeXml(colorDark)
	const light = escapeXml(colorLight)

	let markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(text)}"`
	if (options.class) markup += ` class="${escapeXml(options.class)}"`
	markup += `>`
	markup += `<rect x="0" y="0" width="${total}" height="${total}" fill="${light}"/>`

	const offset = quietZone * scale + margin
	for (let row = 0; row < moduleCount; row++) {
		for (let col = 0; col < moduleCount; col++) {
			if (!model.isDark(row, col)) continue
			markup += `<rect x="${offset + col * scale}" y="${offset + row * scale}" width="${scale}" height="${scale}" fill="${dark}"/>`
		}
	}
	return `${markup}</svg>`
}
