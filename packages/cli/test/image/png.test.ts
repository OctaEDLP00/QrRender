// @vitest-environment node
import { encodeQrPng, parseHexColor, crc32 } from '../../src/image/png.js'
import { QrErrorCorrectLevel, QRCodeModel } from '@qr-render/core'
import { inflateSync } from 'node:zlib'
import { describe, it, expect } from 'vitest'

const makeModel = (text: string, level: 0 | 1 | 2 | 3 = QrErrorCorrectLevel.M) => {
	const model = new QRCodeModel(4, level)
	model.addData(text)
	model.make()
	return model
}

/**
 * Reads the IHDR dimensions out of a PNG buffer.
 */
const readIhdrDimensions = (png: Buffer): { width: number; height: number } => {
	// 8 (signature) + 4 (length) + 4 ("IHDR") => width at offset 16
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

/**
 * Concatenates all IDAT chunks of a PNG into a single buffer.
 */
const readIdat = (png: Buffer): Buffer => {
	const chunks: Buffer[] = []
	let offset = 8
	while (offset < png.length) {
		const length = png.readUInt32BE(offset)
		const type = png.readUInt32BE(offset + 4)
		if (type === 0x49444154) {
			// IDAT
			chunks.push(png.subarray(offset + 8, offset + 8 + length))
		}
		offset += 12 + length
		if (type === 0x49454e44) break
	}
	return Buffer.concat(chunks)
}

describe('parseHexColor', () => {
	it('should parse 3-digit and 6-digit hex (with or without #)', () => {
		expect(parseHexColor('#fff', '#ffffff')).toEqual([255, 255, 255])
		expect(parseHexColor('f0f', '#ffffff')).toEqual([255, 0, 255])
		expect(parseHexColor('#102030', '#000000')).toEqual([16, 32, 48])
	})

	it('should fall back to the fallback color for invalid input', () => {
		expect(parseHexColor('\x1b[40m  \x1b[0m', '#123456')).toEqual([18, 52, 86])
	})
})

describe('encodeQrPng', () => {
	const model = makeModel('https://example.com')
	const options = { scale: 2, quietZone: 1, colorDark: '#000000', colorLight: '#ffffff' }
	const png = encodeQrPng(model, options)
	// Version 4 model => 4*4+17 = 33 modules; + quietZone*2 modules, scaled by 2 px
	const expectedModules = 33 + 1 * 2
	const expectedSize = expectedModules * 2

	it('should start with the PNG signature', () => {
		expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
	})

	it('should encode the scaled dimensions in IHDR', () => {
		const { width, height } = readIhdrDimensions(png)
		expect(width).toBe(expectedSize)
		expect(height).toBe(expectedSize)
	})

	it('should compress RGB scanlines so that decompressed size matches the image', () => {
		const raw = inflateSync(readIdat(png))
		const expected = expectedSize * (expectedSize * 3 + 1)
		expect(raw.length).toBe(expected)
	})

	it('should paint light background on the quiet zone and dark modules in the finder', () => {
		const raw = inflateSync(readIdat(png))
		const stride = expectedSize * 3 + 1
		const pixel = (row: number, col: number): number[] => {
			const base = row * stride + 1 + col * 3
			return [raw[base], raw[base + 1], raw[base + 2]]
		}

		// Corner pixel: quiet zone (light)
		expect(pixel(0, 0)).toEqual([255, 255, 255])
		// Finder pattern top-left corner (dark), offset by 1 module of quiet zone
		expect(pixel(2, 2)).toEqual([0, 0, 0])
	})

	it('should produce a valid CRC-32 (IHDR type CRC matches PNG spec polynomial)', () => {
		// Reference value for the 4 ASCII bytes "IHDR" computed manually
		expect(crc32(Buffer.from('IHDR', 'ascii'))).toBe(2829168138)
	})
})
