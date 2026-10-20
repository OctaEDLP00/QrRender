import { QRMath } from '../../src/libs/QRMath.js'
import { describe, it, expect } from 'vitest'

describe('QRMath', () => {
	it('should calculate gexp correctly within GF(2^8)', () => {
		// 2^0 = 1, 2^1 = 2, 2^2 = 4...
		expect(QRMath.gexp(0)).toBe(1)
		expect(QRMath.gexp(1)).toBe(2)
		expect(QRMath.gexp(4)).toBe(16)
	})

	it('should handle gexp overflow/underflow correctly', () => {
		// El campo es circular (255)
		expect(QRMath.gexp(255)).toBe(QRMath.gexp(0))
		expect(QRMath.gexp(-1)).toBe(QRMath.gexp(254))
	})

	it('should calculate glog as the inverse of gexp', () => {
		const value = 16
		const log = QRMath.glog(value)
		expect(QRMath.gexp(log)).toBe(value)
	})

	it('should throw an error for glog(0)', () => {
		expect(() => QRMath.glog(0)).toThrow()
	})
})
