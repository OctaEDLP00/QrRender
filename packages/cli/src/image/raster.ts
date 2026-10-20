import type { QrImageOptions } from './png.js'
import { parseHexColor } from './png.js'

/**
 * SVG rasterizer for the QR images the CLI emits itself.
 *
 * Terminal image protocols (kitty, iTerm2 inline, sixel, half-blocks) only
 * accept bitmaps, so `--ink` rasterizes `encodeQrSvg()` output on the fly.
 * The parser accepts exactly the grammar `encodeQrSvg()` produces:
 * an optional full-canvas background `<rect>` followed by module `<rect>`.
 */

/**
 * RGB scanlines, one filter byte (0) prepended per row — the same format
 * `renderRgbBuffer()` emits, ready for `encodePngFromRgb()`.
 */
export interface RasterRgb {
	/** Total canvas size in pixels (square image). */
	size: number
	/** Filter-prefixed RGB scanlines. */
	rgb: Buffer
}

/**
 * Extracts every attribute of a tag into a record.
 * @param {string} tag - Full tag text (attributes are `foo-bar="value"`).
 * @param {Record<string, string>} [into] — Optional target record.
 * @returns {Record<string, string>} attributes keyed by lowercase name.
 */
const parseAttributes = (
	tag: string,
	into: Record<string, string> = {}
): Record<string, string> => {
	for (const match of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
		into[match[1].toLowerCase()] = match[2]
	}
	return into
}

/**
 * Rasterizes the SVG document the CLI generates into RGB scanlines.
 * Rects are painted in document order, so the background rect (if present)
 * is the first painted layer.
 * @param {string} svg - SVG document from `encodeQrSvg()`.
 * @returns {RasterRgb} Scanlines plus the square canvas size.
 * @throws {Error} If the document has no <rect> to paint (unsupported grammar).
 */
export const rasterizeSvgRgb = (svg: string): RasterRgb => {
	const rootMatch = /<svg([^>]*)>/.exec(svg)
	const root = rootMatch ? parseAttributes(rootMatch[1]) : {}
	const size = Math.max(
		Number.parseInt(root.width ?? '', 10) || 0,
		Number.parseInt(root.height ?? '', 10) || 0
	)
	if (!size) throw new Error('SVG rasterization: missing canvas size.')

	const stride = size * 3
	const rgb = Buffer.alloc((stride + 1) * size)
	rgb.fill(0) // filter byte 0 per row

	// Paint in document order with a proxy default of the last rect fill.
	const DEFAULT_LIGHT = '#ffffff'
	for (const match of svg.matchAll(/<rect([^>]*)>/g)) {
		const rect = parseAttributes(match[1])
		const x = Number.parseInt(rect.x ?? '0', 10) || 0
		const y = Number.parseInt(rect.y ?? '0', 10) || 0
		const width = Number.parseInt(rect.width ?? '0', 10) || 0
		const height = Number.parseInt(rect.height ?? '0', 10) || 0
		const [r, g, b] = parseHexColor(rect.fill ?? '', DEFAULT_LIGHT)
		for (let dy = y; dy < Math.min(y + height, size); dy++) {
			const rowOffset = dy * (stride + 1) + 1
			for (let dx = x; dx < Math.min(x + width, size); dx++) {
				const offset = rowOffset + dx * 3
				rgb[offset] = r
				rgb[offset + 1] = g
				rgb[offset + 2] = b
			}
		}
	}

	return { size, rgb }
}
