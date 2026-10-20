/**
 * Big-endian growable bit buffer used during QR data assembly.
 *
 * Each byte is stored MSB-first (`putBit` fills bits from position
 * `0x80` downwards), exactly the bit order ISO/IEC 18004 expects on the wire.
 * The bit buffer is the input for both the data-encoding step and the error
 * correction blocks.
 */
export class QRBitBuffer {
	private buffer: number[] = []
	private length: number = 0

	/**
	 * Reads the bit at `index` (0 = first written bit).
	 * @param index Absolute bit index (LSB of the virtual stream last).
	 * @returns `true` when the bit is 1.
	 */
	get(index: number): boolean {
		const bufIndex = Math.floor(index / 8)
		return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1
	}

	/**
	 * Appends the low `length` bits of `num`, most significant first.
	 * @param num Number whose bits are appended.
	 * @param length Number of bits to append (aligned from the MSB).
	 */
	put(num: number, length: number): void {
		for (let i = 0; i < length; i++) {
			this.putBit(((num >>> (length - i - 1)) & 1) === 1)
		}
	}

	/**
	 * Appends a single bit at the current write position, growing the buffer
	 * by one byte whenever the current one is exhausted.
	 * @param bit Bit to append.
	 */
	putBit(bit: boolean): void {
		const bufIndex = Math.floor(this.length / 8)
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0)
		}
		if (bit) {
			this.buffer[bufIndex] |= 0x80 >>> (this.length % 8)
		}
		this.length++
	}

	/**
	 * @returns The total number of bits written so far.
	 */
	getLengthInBits(): number {
		return this.length
	}

	/**
	 * @returns The underlying bytes (MSB-first packing), shared by reference.
	 */
	getBuffer(): number[] {
		return this.buffer
	}
}
