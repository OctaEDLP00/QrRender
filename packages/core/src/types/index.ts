import type { QRCodeModel } from '../core/QRCodeModel.js'

/**
 * Configuration options for QRCode generation.
 */
export interface QRCodeOptions {
	/**
	 * Text to be encoded
	 * @default ''
	 */
	text?: string
	/**
	 * Canvas width in pixels (the square edge for square outputs).
	 * @default 256
	 */
	width?: number
	/**
	 * Canvas height in pixels.
	 * @default 256
	 */
	height?: number
	/**
	 * Color of dark modules
	 * @default '#000000'
	 */
	colorDark?: string
	/**
	 * Color of the light modules
	 * @default '#ffffff'
	 */
	colorLight?: string
	/**
	 * Error correction level
	 *
	 * Possible values
	 * - 0 "M" -> Medium ~15%
	 * - 1 "L" -> Low ~7%
	 * - 2 "H" -> High ~30%
	 * - 3 "Q" -> Quartile ~25%
	 *
	 * @default 2
	 */
	correctLevel?: QrErrorCorrectLevel
	/**
	 * @default 10
	 */
	margin?: number
	/**
	 * @default 4
	 */
	quietZone?: number
	/**
	 * @default 0
	 */
	roundness?: number
	/**
	 * @default 1
	 */
	pixelSize?: number
}

/**
 * Error correction levels for QR codes.
 *
 * Values follow the ISO/IEC 18004 format-information convention (L=1, M=0, Q=3, H=2),
 * which is the same convention the original qrcode.js implementations use.
 * The higher the level, the more redundancy (and the less data capacity).
 */
export const QrErrorCorrectLevel = {
	/**
	 * Medium error correction.
	 * Allows up to ~15% data recovery.
	 */
	M: 0,
	/**
	 * Low error correction.
	 * Allows up to ~7% data recovery.
	 */
	L: 1,
	/**
	 * High error correction.
	 * Allows up to ~30% data recovery.
	 */
	H: 2,
	/**
	 * Quartile error correction.
	 * Allows up to ~25% data recovery.
	 */
	Q: 3,
} as const

export type QrErrorCorrectLevel = (typeof QrErrorCorrectLevel)[keyof typeof QrErrorCorrectLevel]

/**
 * Contract for all renderers: turn a {@link QRCodeModel} matrix into pixels
 * (Canvas), characters (terminal) or any other drawing surface.
 */
export interface DrawingProvider {
	/**
	 * Paints the full symbol, replacing any previous content.
	 * @param model Already-generated model (`make()` applied).
	 */
	draw(model: QRCodeModel): void

	/**
	 * Empties the drawing surface (keeps it mounted for reuse).
	 */
	clear(): void
}
