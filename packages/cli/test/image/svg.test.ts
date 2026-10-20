// @vitest-environment node
import { encodeQrSvg } from '../../src/image/svg.js'
import { QrErrorCorrectLevel, QRCodeModel } from '@qr-render/core'
import { describe, it, expect } from 'vitest'

const makeModel = (text: string) => {
	const model = new QRCodeModel(4, QrErrorCorrectLevel.M)
	model.addData(text)
	model.make()
	return model
}

describe('encodeQrSvg', () => {
	it('should emit a standalone SVG with proper viewBox for scale + quiet zone', () => {
		const model = makeModel('test')
		const svg = encodeQrSvg(model, { scale: 3, quietZone: 2 })
		const expectedTotal = (33 + 2 * 2) * 3

		expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
		expect(svg).toContain(`width="${expectedTotal}" height="${expectedTotal}"`)
		expect(svg).toContain(`viewBox="0 0 ${expectedTotal} ${expectedTotal}"`)
		expect(svg).toContain('shape-rendering="crispEdges"')
		expect(svg.startsWith('<svg')).toBe(true)
		expect(svg.endsWith('</svg>')).toBe(true)
	})

	it('should include exactly one rect per dark module plus the background', () => {
		const model = makeModel('test')
		const options = { scale: 1, quietZone: 0 }

		let darkModules = 0
		for (let r = 0; r < model.getModuleCount(); r++) {
			for (let c = 0; c < model.getModuleCount(); c++) {
				if (model.isDark(r, c)) darkModules++
			}
		}

		const svg = encodeQrSvg(model, options)
		const rectCount = (svg.match(/<rect /g) ?? []).length

		expect(rectCount).toBe(darkModules + 1) // + background rect
	})

	it('should honor custom colors', () => {
		const model = makeModel('test')
		const svg = encodeQrSvg(model, {
			scale: 1,
			colorDark: '#123456',
			colorLight: '#abcdef',
		})

		expect(svg).toContain('fill="#123456"')
		expect(svg).toContain('fill="#abcdef"')
	})
})
