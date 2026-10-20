import { QRMath } from '../libs/QRMath.js'
import { QRPolynomial } from '../libs/QRPolynomial.js'
import type { QrErrorCorrectLevel } from '../types/index.js'
import { QRBitBuffer } from './QRBitBuffer.js'
import { PATTERN_POSITION_TABLE, QRRSBlock } from './QRRSBlock.js'

/**
 * Data model representing the QR code matrix.
 *
 * Owns the complete ISO/IEC 18004 pipeline: functional patterns (finder,
 * timing, alignment), format/type info (BCH-coded), 8-bit byte-mode data
 * assembly with padding, Reed–Solomon interleaved error correction blocks
 * and masked final placement (best of the 8 standard mask patterns).
 *
 * Typical flow:
 *
 * ```ts
 * const model = new QRCodeModel(3, QrErrorCorrectLevel.M)
 * model.addData('https://example.com')
 * model.make() // → matrix ready: isDark(row, col) / getModuleCount()
 * ```
 */
export class QRCodeModel {
	private moduleCount: number
	private modules: (boolean | null)[][] = []
	private dataCache: number[] | null = null
	private dataList: string[] = []

	/**
	 * @param typeNumber Symbol version (1–40). `moduleCount = version * 4 + 17`.
	 * @param errorCorrectLevel ISO convention (M=0, L=1, H=2, Q=3).
	 */
	constructor(
		private typeNumber: number,
		private errorCorrectLevel: QrErrorCorrectLevel
	) {
		this.moduleCount = 0
	}

	/**
	 * Queues a segment for encoding (8-bit byte mode) and invalidates the
	 * cached codewords. Can be called multiple times to concatenate segments.
	 * @param data Raw text; encoded per char code (no auto ECI/multibyte).
	 */
	addData(data: string): void {
		this.dataList.push(data)
		this.dataCache = null
	}

	/**
	 * Reads one matrix cell. Call after {@link make}.
	 * @param row Row index (0 = top).
	 * @param col Column index (0 = left).
	 * @returns `true` for a dark module, `false` for a light one.
	 * @throws If the coordinates fall outside the matrix.
	 */
	isDark(row: number, col: number): boolean {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(`Coordinates out of bounds: ${row},${col}`)
		}
		return this.modules[row][col] === true
	}

	/**
	 * @returns Edge length of the square matrix in modules (`typeNumber * 4 + 17`
	 * after `make()`; `0` before it).
	 */
	getModuleCount(): number {
		return this.moduleCount
	}

	/**
	 * Finalizes the symbol: score-tests every mask pattern, picks the best and
	 * constructs the immutable matrix. Data is cached so repeated masking
	 * trials do not re-encode.
	 * @throws Propagates Reed–Solomon/overflow errors from data assembly.
	 */
	make(): void {
		this.makeImpl(false, this.getBestMaskPattern())
	}

	/**
	 * Builds the whole matrix under one mask pattern.
	 * @param test When true, format bits are written unset (mask trials must
	 * not leak format payload while scoring).
	 * @param maskPattern Selected mask (0–7).
	 */
	private makeImpl(test: boolean, maskPattern: number): void {
		this.moduleCount = this.typeNumber * 4 + 17
		this.modules = Array.from({ length: this.moduleCount }, () =>
			new Array(this.moduleCount).fill(null)
		)

		this.setupPositionProbePattern(0, 0)
		this.setupPositionProbePattern(this.moduleCount - 7, 0)
		this.setupPositionProbePattern(0, this.moduleCount - 7)
		this.setupPositionAdjustPattern()
		this.setupTimingPattern()
		this.setupTypeInfo(test, maskPattern)

		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test)
		}

		if (this.dataCache == null) {
			this.dataCache = this.createData(this.typeNumber, this.errorCorrectLevel, this.dataList)
		}

		this.mapData(this.dataCache, maskPattern)
	}

	/**
	 * Builds each of the 8 masked candidates and returns the lowest penalty
	 * mask (QR spec loss rules, applied loosely).
	 * @returns Best mask pattern index (0–7).
	 */
	private getBestMaskPattern(): number {
		let minPenalty = 0
		let bestPattern = 0

		for (let i = 0; i < 8; i++) {
			this.makeImpl(true, i)
			const penalty = this.getPenaltyScore()
			if (i === 0 || penalty < minPenalty) {
				minPenalty = penalty
				bestPattern = i
			}
		}
		return bestPattern
	}

	/**
	 * Places one finder pattern (7×7 ring, 3×3 eye, surrounding separator) at
	 * a corner anchor; the ±1 border paints separators clear.
	 * @param row Anchor row of the 7×7 block (0 or moduleCount-7).
	 * @param col Anchor column of the 7×7 block.
	 */
	private setupPositionProbePattern(row: number, col: number): void {
		for (let r = -1; r <= 7; r++) {
			if (row + r <= -1 || this.moduleCount <= row + r) continue
			for (let c = -1; c <= 7; c++) {
				if (col + c <= -1 || this.moduleCount <= col + c) continue
				if (
					(0 <= r && r <= 6 && (c === 0 || c === 6)) ||
					(0 <= c && c <= 6 && (r === 0 || r === 6)) ||
					(2 <= r && r <= 4 && 2 <= c && c <= 4)
				) {
					this.modules[row + r][col + c] = true
				} else {
					this.modules[row + r][col + c] = false
				}
			}
		}
	}

	/**
	 * Paints the alternating timing stripes (row 6 and column 6), skipping
	 * cells already reserved by other functional patterns.
	 */
	private setupTimingPattern(): void {
		for (let r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) continue
			this.modules[r][6] = r % 2 === 0
		}
		for (let c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) continue
			this.modules[6][c] = c % 2 === 0
		}
	}

	/**
	 * Places the alignment patterns (2 at V1, up to 7 clusters at V40+),
	 * skipping any cell already claimed by finder/timing patterns.
	 */
	private setupPositionAdjustPattern(): void {
		const pos = QRUtil.getPatternPosition(this.typeNumber)
		for (let i = 0; i < pos.length; i++) {
			for (let j = 0; j < pos.length; j++) {
				const row = pos[i]
				const col = pos[j]
				if (this.modules[row][col] !== null) continue

				for (let r = -2; r <= 2; r++) {
					for (let c = -2; c <= 2; c++) {
						if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
							this.modules[row + r][col + c] = true
						} else {
							this.modules[row + r][col + c] = false
						}
					}
				}
			}
		}
	}

	/**
	 * BCH-codes format/version info and writes it twice (reserved areas).
	 * @param test When true, every bit is written as light (mask trials).
	 */
	private setupTypeNumber(test: boolean): void {
		const bits = QRUtil.getBCHTypeNumber(this.typeNumber)
		for (let i = 0; i < 18; i++) {
			const mod = !test && ((bits >> i) & 1) === 1
			this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod
			this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod
		}
	}

	/**
	 * Writes the masked format info bits (15 bits, 2 placements) plus the
	 * always-dark "dark module" corner.
	 * @param test Suppress payload writing (mask trials only).
	 * @param maskPattern Selected mask (0–7).
	 */
	private setupTypeInfo(test: boolean, maskPattern: number): void {
		const data = (this.errorCorrectLevel << 3) | maskPattern
		const bits = QRUtil.getBCHTypeInfo(data)

		for (let i = 0; i < 15; i++) {
			const mod = !test && ((bits >> i) & 1) === 1

			if (i < 6) {
				this.modules[i][8] = mod
			} else if (i < 8) {
				this.modules[i + 1][8] = mod
			} else {
				this.modules[this.moduleCount - 15 + i][8] = mod
			}

			if (i < 8) {
				this.modules[8][this.moduleCount - i - 1] = mod
			} else if (i < 9) {
				this.modules[8][15 - i - 1 + 1] = mod
			} else {
				this.modules[8][15 - i - 1] = mod
			}
		}
		// Fixed module
		this.modules[this.moduleCount - 8][8] = !test
	}

	/**
	 * Places data codewords in the standard two-column bottom-up serpentine
	 * (columns 8–6 and 1–0 skipped for format info), XORed per QRMask rules.
	 * @param data Interleaved codewords (data + ECC).
	 * @param maskPattern Selected mask (0–7).
	 */
	private mapData(data: number[], maskPattern: number): void {
		let inc = -1
		let row = this.moduleCount - 1
		let bitIndex = 7
		let byteIndex = 0

		for (let col = this.moduleCount - 1; col > 0; col -= 2) {
			if (col === 6) col-- // skip timing column

			while (true) {
				for (let c = 0; c < 2; c++) {
					if (this.modules[row][col - c] === null) {
						let dark = false
						if (byteIndex < data.length) {
							dark = ((data[byteIndex] >>> bitIndex) & 1) === 1
						}
						if (QRUtil.getMask(maskPattern, row, col - c)) {
							dark = !dark
						}
						this.modules[row][col - c] = dark
						bitIndex--
						if (bitIndex === -1) {
							byteIndex++
							bitIndex = 7
						}
					}
				}
				row += inc
				// The zigzag turns around when an edge is reached
				if (row < 0 || this.moduleCount <= row) {
					row -= inc
					inc = -inc
					break
				}
			}
		}
	}

	/**
	 * Byte-mode data assembly: mode header (0100), count, payload bytes,
	 * terminator + pad bytes (0xEC/0x11) to fill the block capacity, then the
	 * Reed–Solomon interleaving applies.
	 * @param typeNumber Symbol version (1–40).
	 * @param errorCorrectLevel ISO-convention level.
	 * @param dataList Data segments queued via {@link addData}.
	 * @returns Interleaved data + ECC codewords (the raw hex matrix payload).
	 * @throws Code length overflow when the data exceeds the level/version capacity.
	 */
	private createData(
		typeNumber: number,
		errorCorrectLevel: QrErrorCorrectLevel,
		dataList: string[]
	): number[] {
		const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel)
		const buffer = new QRBitBuffer()

		for (const data of dataList) {
			// 8-bit Byte Mode (0100)
			buffer.put(4, 4)
			buffer.put(data.length, QRUtil.getLengthInBits(4, typeNumber) || 8)
			for (let i = 0; i < data.length; i++) {
				buffer.put(data.charCodeAt(i), 8)
			}
		}

		// Padding
		let totalDataCount = 0
		for (const block of rsBlocks) {
			totalDataCount += block.dataCount
		}

		if (buffer.getLengthInBits() > totalDataCount * 8) {
			throw new Error(`Code length overflow. (${buffer.getLengthInBits()} > ${totalDataCount * 8})`)
		}

		if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
			buffer.put(0, 4) // terminator
		}

		while (buffer.getLengthInBits() % 8 !== 0) {
			buffer.putBit(false)
		}

		while (true) {
			if (buffer.getLengthInBits() >= totalDataCount * 8) break
			buffer.put(0xec, 8)
			if (buffer.getLengthInBits() >= totalDataCount * 8) break
			buffer.put(0x11, 8)
		}

		return this.createBytes(buffer, rsBlocks)
	}

	/**
	 * Splits the bit buffer into Reed–Solomon blocks, calculates each block's
	 * ECC, and interleaves data+ECC codewords (spec order). Self-contained:
	 * no mutable state is shared with the callers.
	 * @param buffer Fully padded data bit buffer.
	 * @param rsBlocks Capacity blocks for the version/level.
	 * @returns Interleaved codeword array (data first, then ECC).
	 */
	private createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): number[] {
		let offset = 0
		let maxDcCount = 0
		let maxEcCount = 0
		const dcdata: number[][] = new Array(rsBlocks.length)
		const ecdata: number[][] = new Array(rsBlocks.length)

		for (let r = 0; r < rsBlocks.length; r++) {
			const dcCount = rsBlocks[r].dataCount
			const ecCount = rsBlocks[r].totalCount - dcCount
			maxDcCount = Math.max(maxDcCount, dcCount)
			maxEcCount = Math.max(maxEcCount, ecCount)

			dcdata[r] = new Array(dcCount)
			for (let i = 0; i < dcdata[r].length; i++) {
				dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset]
			}
			offset += dcCount

			const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount)
			const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1)
			const modPoly = rawPoly.mod(rsPoly)

			ecdata[r] = new Array(rsPoly.getLength() - 1)
			for (let i = 0; i < ecdata[r].length; i++) {
				const modIndex = i + modPoly.getLength() - ecdata[r].length
				ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0
			}
		}

		let totalCodeCount = 0
		for (const block of rsBlocks) {
			totalCodeCount += block.totalCount
		}

		const data = new Array(totalCodeCount)
		let index = 0

		// Interleave data codewords, round-robin across blocks
		for (let i = 0; i < maxDcCount; i++) {
			for (let r = 0; r < rsBlocks.length; r++) {
				if (i < dcdata[r].length) {
					data[index++] = dcdata[r][i]
				}
			}
		}

		// Interleave ECC codewords after the payload
		for (let i = 0; i < maxEcCount; i++) {
			for (let r = 0; r < rsBlocks.length; r++) {
				if (i < ecdata[r].length) {
					data[index++] = ecdata[r][i]
				}
			}
		}

		return data
	}

	/**
	 * Loss scoring between mask candidates (QR spec loss rules):
	 * N1 runs of 5+ same color, N2 2×2 blocks of a single color, N4 dark/light
	 * balance bias "espejo" — used to pick a {@link makeImpl maskPattern} with
	 * minimal weighted penalty.
	 * @returns Lower is better; candidates are scored under identical conditions.
	 */
	private getPenaltyScore(): number {
		let score = 0

		// Rule 1: 5+ same color in row/col
		for (let row = 0; row < this.moduleCount; row++) {
			for (let col = 0; col < this.moduleCount; col++) {
				let sameCount = 0
				let dark = this.isDark(row, col)
				for (let r = -1; r <= 1; r++) {
					if (row + r < 0 || this.moduleCount <= row + r) continue
					for (let c = -1; c <= 1; c++) {
						if (col + c < 0 || this.moduleCount <= col + c) continue
						if (r === 0 && c === 0) continue
						if (dark === this.isDark(row + r, col + c)) sameCount++
					}
				}
				if (sameCount > 5) score += 3 + sameCount - 5
			}
		}

		// Rule 2: 2×2 blocks of a single color
		for (let row = 0; row < this.moduleCount - 1; row++) {
			for (let col = 0; col < this.moduleCount - 1; col++) {
				const count =
					(this.isDark(row, col) ? 1 : 0) +
					(this.isDark(row + 1, col) ? 1 : 0) +
					(this.isDark(row, col + 1) ? 1 : 0) +
					(this.isDark(row + 1, col + 1) ? 1 : 0)

				if (count === 0 || count === 4) score += 3
			}
		}

		// Rule 4: dark/light balance bias
		let darkCount = 0
		for (let row = 0; row < this.moduleCount; row++) {
			for (let col = 0; col < this.moduleCount; col++) {
				if (this.isDark(row, col)) darkCount++
			}
		}
		const ratio = Math.abs((100 * darkCount) / this.moduleCount / this.moduleCount - 50) / 5
		score += ratio * 10

		return score
	}
}

// ---------------------------------------------------------------------
// Internal Utils & Constants (Kept here to avoid circular dependencies)
// ---------------------------------------------------------------------

/**
 * Internal helpers: BCH format arithmetic, alignment pattern tables, mask
 * evaluation and RS polynomial factory. Kept as an internal module-scoped
 * constant — not part of the public API surface.
 */
const QRUtil = {
	/** BCH-wraps 15-bit format info bits with the standard generator (1335) + XOR (21522). */
	getBCHTypeInfo(data: number): number {
		let d = data << 10
		while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335) >= 0) {
			d ^= 1335 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335))
		}
		return ((data << 10) | d) ^ 21522
	},

	/** BCH-wraps 18 bits of the version indicator for versions 7+ (generator 7973, no mask XOR). */
	getBCHTypeNumber(data: number): number {
		let d = data << 12
		while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(7973) >= 0) {
			d ^= 7973 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(7973))
		}
		return (data << 12) | d
	},

	/** Multitask counting: bit length of a number (1-based position of the highest set bit). */
	getBCHDigit(data: number): number {
		let digit = 0
		while (data !== 0) {
			digit++
			data >>>= 1
		}
		return digit
	},

	/** Alignment-pattern anchor coordinates for the version (referenced to `PATTERN_POSITION_TABLE`). */
	getPatternPosition(typeNumber: number): number[] {
		return PATTERN_POSITION_TABLE[typeNumber - 1]
	},

	/** Mask function `m(i, j)` per pattern index (ISO/IEC 18004 §8.8.2). */
	getMask(maskPattern: number, i: number, j: number): boolean {
		switch (maskPattern) {
			case 0:
				return (i + j) % 2 === 0
			case 1:
				return i % 2 === 0
			case 2:
				return j % 3 === 0
			case 3:
				return (i + j) % 3 === 0
			case 4:
				return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0
			case 5:
				return ((i * j) % 2) + ((i * j) % 3) === 0
			case 6:
				return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0
			case 7:
				return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0
			default:
				throw new Error(`bad maskPattern: ${maskPattern}`)
		}
	},

	/** Builds the generator polynomial `∏ (x − α^i)` of degree `errorCorrectLength`. */
	getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
		let a = new QRPolynomial([1], 0)
		for (let i = 0; i < errorCorrectLength; i++) {
			a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0))
		}
		return a
	},

	/** Character-count indicator width, in bits, for the byte mode at each version. */
	getLengthInBits(mode: number, type: number): number {
		if (1 <= type && type < 10) return 8
		if (type < 27) return 16
		if (type < 41) return 16
		return 0
	},
}
