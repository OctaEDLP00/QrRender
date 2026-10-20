import type { QRCodeModel } from '@qr-render/core'
import { deflateSync } from 'node:zlib'

/**
 * Options for raster (PNG) exporters: pixel scale, colors and quiet zone.
 */
export interface QrImageOptions {
	/**
	 * Scale factor: pixels per module.
	 * @default 1
	 */
	scale?: number
	/**
	 * Modules of quiet zone padded around the code.
	 * @default 4
	 */
	quietZone?: number
	/**
	 * Fill color for dark modules ("#rgb" or "#rrggbb").
	 * @default '#000000'
	 */
	colorDark?: string
	/**
	 * Fill color for light modules ("#rgb" or "#rrggbb").
	 * @default '#ffffff'
	 */
	colorLight?: string
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) as Buffer

/**
 * Parses a CSS-style hex color ("#rgb" / "#rrggbb", with optional leading "#").
 * @param {string} value - The color to parse.
 * @param {string} fallback - 6-digit "#rrggbb" used when `value` is not parseable.
 * @returns {number[]} An [r, g, b] triplet.
 */
export const parseHexColor = (value: string | undefined, fallback: string): number[] => {
	const raw = typeof value === 'string' && value.length > 0 ? value : fallback
	const hex = raw.startsWith('#') ? raw.slice(1) : raw
	if (/^[0-9a-fA-F]{3}$/.test(hex)) {
		return [
			Number.parseInt(hex[0] + hex[0], 16),
			Number.parseInt(hex[1] + hex[1], 16),
			Number.parseInt(hex[2] + hex[2], 16),
		]
	}
	if (/^[0-9a-fA-F]{6}$/.test(hex)) {
		return [
			Number.parseInt(hex.slice(0, 2), 16),
			Number.parseInt(hex.slice(2, 4), 16),
			Number.parseInt(hex.slice(4, 6), 16),
		]
	}
	return parseHexColor(fallback, '#000000')
}

/**
 * Builds a PNG chunk: [4-byte length][4-byte type][data][4-byte CRC32]
 */
const createChunk = (type: string, data: Buffer): Buffer => {
	const chunk = Buffer.alloc(data.length + 12)
	chunk.writeUInt32BE(data.length, 0)
	chunk.write(type, 4, 'ascii')
	data.copy(chunk, 8)
	chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length)
	return chunk
}

// Precomputed CRC-32 table (polynomial 0xEDB88320)
const CRC_TABLE: number[] = (() => {
	const table = new Array<number>(256)
	for (let n = 0; n < 256; n++) {
		let c = n
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		}
		table[n] = c >>> 0
	}
	return table
})()

/**
 * CRC-32 as required by the PNG spec.
 */
export const crc32 = (bytes: Uint8Array): number => {
	let crc = 0xffffffff
	for (let i = 0; i < bytes.length; i++) {
		crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
	}
	return (crc ^ 0xffffffff) >>> 0
}

/**
 * Renders a QR model (with quiet zone and scale) into a raster buffer of
 * [row][rgb triplets] scanlines ready to be deflate-compressed.
 * @returns {Buffer} Raw RGBA-free RGB scanlines, each prefixed by its filter byte (0).
 */
export const renderRgbBuffer = (
	model: QRCodeModel,
	options: Required<Pick<QrImageOptions, 'scale' | 'quietZone' | 'colorDark' | 'colorLight'>>
): Buffer => {
	const { scale, quietZone, colorDark, colorLight } = options
	const dark = parseHexColor(colorDark, '#000000')
	const light = parseHexColor(colorLight, '#ffffff')
	const moduleCount = model.getModuleCount()
	const padding = Math.max(0, quietZone)
	const size = (moduleCount + padding * 2) * scale
	const stride = size * 3

	const raw = Buffer.alloc((stride + 1) * size)
	raw.fill(0) // filter byte 0 per row

	const paint = (pixelRow: number, pixelCol: number, color: number[]): void => {
		const offset = pixelRow * (stride + 1) + 1 + pixelCol * 3
		raw[offset] = color[0]
		raw[offset + 1] = color[1]
		raw[offset + 2] = color[2]
	}

	for (let row = 0; row < size; row++) {
		const moduleRow = Math.floor(row / scale)
		for (let col = 0; col < size; col++) {
			const moduleCol = Math.floor(col / scale)
			const insideMatrix =
				moduleRow >= padding &&
				moduleRow < moduleCount + padding &&
				moduleCol >= padding &&
				moduleCol < moduleCount + padding
			// Canvas Y coordinate of that module (row: 0 at top)
			const localRow = moduleRow - padding
			const localCol = moduleCol - padding
			// X/Y mirrors: isDark expects (row, col) - the model matrix is row-major
			const isDarkModule = insideMatrix && model.isDark(localRow, localCol)
			paint(row, col, isDarkModule ? dark : light)
		}
	}

	return raw
}

/**
 * Encodes a QRCodeModel into a PNG (AA level, RGB truecolor) file.
 * Zero dependencies: only uses node:zlib for compression.
 * @param {QRCodeModel} model - Generated model (make() must have been called).
 * @param {QrImageOptions} options - Scale, colors and quiet zone.
 */
export const encodeQrPng = (model: QRCodeModel, options: QrImageOptions = {}): Buffer => {
	const scale = Math.max(1, Math.floor(options.scale ?? 1))
	const quietZone = Math.max(0, Math.floor(options.quietZone ?? 4))
	const rgb = renderRgbBuffer(model, {
		scale,
		quietZone,
		colorDark: options.colorDark ?? '#000000',
		colorLight: options.colorLight ?? '#ffffff',
	})
	const compressed = deflateSync(rgb, { level: 9 })

	const moduleCount = model.getModuleCount()
	const size = (moduleCount + quietZone * 2) * scale

	const ihdr = Buffer.alloc(13)
	ihdr.writeUInt32BE(size, 0)
	ihdr.writeUInt32BE(size, 4)
	ihdr[8] = 8 // bit depth
	ihdr[9] = 2 // color type: truecolor RGB
	ihdr[10] = 0 // compression: deflate
	ihdr[11] = 0 // filter: adaptive per-row (we emit 0)
	ihdr[12] = 0 // interlace: none

	return Buffer.concat([
		PNG_SIGNATURE,
		createChunk('IHDR', ihdr),
		createChunk('IDAT', compressed),
		createChunk('IEND', Buffer.alloc(0)),
	])
}
