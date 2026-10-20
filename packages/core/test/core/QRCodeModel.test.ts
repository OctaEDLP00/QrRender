import { QRCodeModel } from '../../src/core/QRCodeModel.js'
import { QrErrorCorrectLevel } from '@qr-render/core'
import { describe, it, expect } from 'vitest'

describe('QRCodeModel', () => {
	it('should be able to be instantiated', () => {
		const model = new QRCodeModel(1, QrErrorCorrectLevel.L)
		expect(model).toBeInstanceOf(QRCodeModel)
	})

	it('should return correct module count', () => {
		const version = 5
		const model = new QRCodeModel(version, QrErrorCorrectLevel.M)
		model.make()
		const expectedSize = (version - 1) * 4 + 21
		expect(model.getModuleCount()).toBe(expectedSize)
	})

	it('should have dark modules after adding data and making', () => {
		const model = new QRCodeModel(3, QrErrorCorrectLevel.L)
		model.addData('https://github.com/OctaEDLP00/qrx')
		model.make()

		// El Finder Pattern (0,0) siempre debe ser oscuro tras el make()
		expect(model.isDark(0, 0)).toBe(true)
	})

	it('should handle out-of-bounds module access gracefully', () => {
		const model = new QRCodeModel(1, QrErrorCorrectLevel.L)
		model.make()
		const size = model.getModuleCount()

		// Validamos que lance el error de coordenadas fuera de rango
		expect(() => model.isDark(-1, 0)).toThrow(/out of bounds/)
		expect(() => model.isDark(size, size)).toThrow(/out of bounds/)
	})
})

describe('QRCodeModel Edge Cases', () => {
	it('should handle version 1 correctly', () => {
		const model = new QRCodeModel(1, QrErrorCorrectLevel.L)
		model.make()
		expect(model.getModuleCount()).toBe(21)
	})

	it('should handle maximum supported version (10) correctly', () => {
		const maxSupported = 10
		const model = new QRCodeModel(maxSupported, QrErrorCorrectLevel.H)
		model.make()
		const expectedSize = (maxSupported - 1) * 4 + 21
		expect(model.getModuleCount()).toBe(expectedSize)
	})

	it('should correctly initialize modules and respond to isDark', () => {
		const model = new QRCodeModel(3, QrErrorCorrectLevel.M)
		model.addData('test')
		model.make()

		const size = model.getModuleCount()
		let hasDarkPixel = false

		// Buscamos al menos un píxel oscuro en la matriz generada
		for (let r = 0; r < size; r++) {
			for (let c = 0; c < size; c++) {
				if (model.isDark(r, c)) {
					hasDarkPixel = true
					break
				}
			}
			if (hasDarkPixel) break
		}
		expect(hasDarkPixel).toBe(true)
	})
})
