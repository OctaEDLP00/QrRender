/**
 * Mathematical utilities for calculating polynomials in Galois fields.
 * Essential for Reed-Solomon coding.
 */
export const QRMath = {
	/**
	 *
	 * @param n
	 * @returns number
	 */
	glog: (n: number): number => {
		if (n < 1) throw new Error(`glog(${n}): ${QRMath.glog(n)}`)
		return LOG_TABLE[n]
	},

	/**
	 *
	 * @param n
	 * @returns number
	 */
	gexp: (n: number): number => {
		while (n < 0) n += 255
		while (n >= 256) n -= 255
		return EXP_TABLE[n]
	},
}

/**
 *
 */
const EXP_TABLE: number[] = Array.from({ length: 256 })
/**
 *
 */
const LOG_TABLE: number[] = Array.from({ length: 256 })
;(function initTables() {
	let x = 1
	for (let i = 0; i < 256; i++) {
		EXP_TABLE[i] = x
		LOG_TABLE[x] = i
		x <<= 1
		if (x & 0x100) x ^= 0x11d
	}
})()
