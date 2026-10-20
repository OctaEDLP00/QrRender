import { QRPolynomial } from '../../src/libs/QRPolynomial.js'
import { describe, it, expect } from 'vitest'

describe('QRPolynomial', () => {
	it('should initialize and handle leading zeros (offset)', () => {
		// [0, 0, 1, 2] con shift 0 -> [1, 2]
		const poly = new QRPolynomial([0, 0, 1, 2], 0)
		expect(poly.getLength()).toBe(2)
		expect(poly.get(0)).toBe(1)
	})

	it('should multiply two polynomials in Galois Field', () => {
		const p1 = new QRPolynomial([1], 0)
		const p2 = new QRPolynomial([1, 2], 0)
		const result = p1.multiply(p2)

		expect(result.getLength()).toBe(2)
		expect(result.get(0)).toBe(1)
	})

	it('should calculate remainder (mod) for error correction', () => {
		// Caso típico de Reed-Solomon: Polinomio de datos mod Polinomio generador
		const data = new QRPolynomial([32, 65, 205, 69, 41], 2)
		const generator = new QRPolynomial([1, 3, 2], 0)

		const remainder = data.mod(generator)
		expect(remainder.getLength()).toBeLessThan(data.getLength())
	})
})
