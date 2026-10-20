import { QRRSBlock } from '../../src/core/QRRSBlock.js'
import { QrErrorCorrectLevel } from '@qr-render/core'
import { describe, it, expect } from 'vitest'

describe('QRRSBlock', () => {
	it('should get correct RS block table for Version 1 Level L', () => {
		const table = QRRSBlock.getRsBlockTable(1, QrErrorCorrectLevel.L)
		expect(table).toEqual([1, 26, 19])
	})

	it('should map Error Levels to correct table indices', () => {
		// Version 2 Level H (Index (2-1)*4 + 3 = 7) -> [1, 44, 16]
		const tableH = QRRSBlock.getRsBlockTable(2, QrErrorCorrectLevel.H)
		expect(tableH).toEqual([1, 44, 16])

		// Version 2 Level M (Index (2-1)*4 + 1 = 5) -> [1, 44, 28]
		const tableM = QRRSBlock.getRsBlockTable(2, QrErrorCorrectLevel.M)
		expect(tableM).toEqual([1, 44, 28])
	})

	it('should expand block counts into individual QRRSBlock instances', () => {
		// Version 4 Level Q has [2, 50, 24] -> Should return 2 blocks
		const blocks = QRRSBlock.getRSBlocks(4, QrErrorCorrectLevel.Q)

		expect(blocks).toHaveLength(2)
		expect(blocks[0].totalCount).toBe(50)
		expect(blocks[0].dataCount).toBe(24)
		expect(blocks[1].dataCount).toBe(24)
	})

	it('should handle complex RS blocks with different sizes (Version 5 Q)', () => {
		const blocks = QRRSBlock.getRSBlocks(5, QrErrorCorrectLevel.Q)

		// 2 blocks of size 33 + 2 blocks of size 34 = 4 blocks total
		expect(blocks).toHaveLength(4)

		// First two blocks
		expect(blocks[0].totalCount).toBe(33)
		expect(blocks[1].totalCount).toBe(33)

		// Last two blocks
		expect(blocks[2].totalCount).toBe(34)
		expect(blocks[3].totalCount).toBe(34)
	})

	it('should throw an error for unsupported version or level combinations', () => {
		// Assuming version 41 is not in the table
		expect(() => QRRSBlock.getRSBlocks(41, QrErrorCorrectLevel.L)).toThrow(/bad rs block/)
	})

	it('should correctly initialize instance properties', () => {
		const block = new QRRSBlock(100, 80)
		expect(block.totalCount).toBe(100)
		expect(block.dataCount).toBe(80)
	})

	it('should support the complete RS table up to version 40', () => {
		// Version 40 capacities per ISO/IEC 18004
		const cases = [
			{ level: QrErrorCorrectLevel.L, blocks: 25, dataCodewords: 2956 },
			{ level: QrErrorCorrectLevel.M, blocks: 49, dataCodewords: 2334 },
			{ level: QrErrorCorrectLevel.Q, blocks: 68, dataCodewords: 1666 },
			{ level: QrErrorCorrectLevel.H, blocks: 81, dataCodewords: 1276 },
		]
		for (const { level, blocks, dataCodewords } of cases) {
			const rs = QRRSBlock.getRSBlocks(40, level)
			expect(rs).toHaveLength(blocks)
			expect(rs.reduce((acc, b) => acc + b.dataCount, 0)).toBe(dataCodewords)
		}
	})
})
