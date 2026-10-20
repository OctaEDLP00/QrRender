import { QRBitBuffer } from '../../src/core/QRBitBuffer.js'
import { describe, it, expect } from 'vitest'

describe('QRBitBuffer', () => {
	it('should be able to be instantiated', () => {
		const buffer = new QRBitBuffer()
		expect(buffer instanceof QRBitBuffer, 'buffer should be an instance of QRBitBuffer')
	})

	it('should be able to put bits and get length in bits', () => {
		const buffer = new QRBitBuffer()
		buffer.put(0b101, 3)
		expect(buffer.getLengthInBits() === 3, 'buffer length should be 3 bits')
	})

	it('should be able to get bits correctly', () => {
		const buffer = new QRBitBuffer()
		buffer.put(0b101, 3)
		expect(buffer.get(0, 3) === 0b101, 'buffer bits should be 0b101')
	})

	it('should handle multiple puts and gets correctly', () => {
		const buffer = new QRBitBuffer()
		buffer.put(0b1101, 4)
		buffer.put(0b011, 3)
		expect(buffer.getLengthInBits() === 7, 'buffer length should be 7 bits')
		expect(buffer.get(0, 4) === 0b1101, 'first 4 bits should be 0b1101')
		expect(buffer.get(4, 3) === 0b011, 'next 3 bits should be 0b011')
	})
})

describe('QRBitBuffer Edge Cases', () => {
	it('should handle putting zero bits', () => {
		const buffer = new QRBitBuffer()
		buffer.put(0, 0)
		expect(buffer.getLengthInBits() === 0, 'buffer length should be 0 bits')
	})

	it('should handle getting bits from an empty buffer', () => {
		const buffer = new QRBitBuffer()
		try {
			buffer.get(0)
			expect(false, 'should have thrown an error when getting bits from empty buffer')
		} catch (e) {
			expect(true, 'correctly threw an error when getting bits from empty buffer')
		}
	})

	it('should handle putting and getting a large number of bits', () => {
		const buffer = new QRBitBuffer()
		const largeNumber = 0xffffffff
		buffer.put(largeNumber, 32)
		expect(buffer.getLengthInBits() === 32, 'buffer length should be 32 bits')
		expect(buffer.get(0, 32) === largeNumber, 'buffer bits should match the large number put in')
	})
})
