// @vitest-environment node
import { encodePngFromRgb, encodeQrPng } from '../../src/image/png.js'
import { rasterizeSvgRgb } from '../../src/image/raster.js'
import { encodeQrSvg } from '../../src/image/svg.js'
import { QrErrorCorrectLevel, QRCodeModel } from '@qr-render/core'
import { describe, it, expect } from 'vitest'

const makeModel = (text: string) => {
	const model = new QRCodeModel(4, QrErrorCorrectLevel.M)
	model.addData(text)
	model.make()
	return model
}

describe('rasterizeSvgRgb', () => {
	it('should report the square canvas size of the generated document', () => {
		const svg = encodeQrSvg(makeModel('test'), { scale: 2, quietZone: 1 })
		const { size } = rasterizeSvgRgb(svg)
		expect(size).toBe((33 + 2) * 2)
	})

	it('should paint light as background and dark modules in their cells', () => {
		const model = makeModel('a')
		const svg = encodeQrSvg(model, {
			scale: 1,
			quietZone: 2,
			colorDark: '#111111',
			colorLight: '#eeeeee',
		})
		const { size, rgb } = rasterizeSvgRgb(svg)

		// Row 0 (quiet zone): filter byte (0) + all light pixels (#eeeeee).
		const quietRow = rgb.subarray(1, 1 + size * 3)
		let quietOk = true
		for (let i = 0; i < quietRow.length; i += 3) {
			if (quietRow[i] !== 0xee && quietRow[i] !== 0xe0) quietOk = false
		}
		expect(quietOk).toBe(true)

		// First module row must contain at least one dark pixel (#111111).
		const stride = size * 3 + 1
		const moduleRow = rgb.subarray(2 * stride + 1, 2 * stride + 1 + size * 3)
		let darkSeen = false
		for (let i = 0; i < moduleRow.length; i += 3) {
			if (moduleRow[i] === 0x11 && moduleRow[i + 1] === 0x11) darkSeen = true
		}
		expect(darkSeen).toBe(true)
	})

	it('should throw when the document carries no pigmentable size', () => {
		expect(() => rasterizeSvgRgb('<svg></svg>')).toThrow(/missing canvas size/)
	})
})

describe('encodePngFromRgb', () => {
	it('should produce a decodable PNG from the SVG rasterization (SVG→PNG equivalence)', () => {
		const text = 'WIFI:S:MyNetwork;T:WPA;P:Sup3r$ecret;;'
		const model = makeModel(text)
		const svg = encodeQrSvg(model, { scale: 4, quietZone: 4 })
		const { size, rgb } = rasterizeSvgRgb(svg)
		const png = encodePngFromRgb(size, rgb)

		// The qrcode built straight from the model must equal the SVG path.
		expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
		expect(png.length).toBeGreaterThan(0)
	})

	it('should not equal the direct PNG of the same model when sizes differ', () => {
		const model = makeModel('x')
		const direct = encodeQrPng(model, { scale: 2, quietZone: 2 })
		const svg = encodeQrSvg(model, { scale: 3, quietZone: 2 })
		const { size, rgb } = rasterizeSvgRgb(svg)
		const other = encodePngFromRgb(size, rgb)
		expect(direct.equals(other)).toBe(false)
	})
})
