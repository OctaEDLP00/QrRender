/**
 * Mathematical utilities for calculating polynomials in Galois fields.
 * Essential for Reed-Solomon coding.
 *
 * GF(2^8) with the primitive polynomial 0x11d (the QR standard): values are
 * represented both in polynomial and exponential (α^i) form, and the two
 * tables convert between both in O(1) — so GF multiplication resolves to two
 * lookups plus an addition instead of heavy arithmetic.
 */
export const QRMath = {
	/**
	 * Discrete logarithm in GF(2^8): exponent of the α-power for the value `n`.
	 * @param n Value in polynomial form (1–255).
	 * @returns Exponent `i` such that `α^i = n` (0–255).
	 * @throws For 0: log is undefined in GF(2^8).
	 */
	glog: (n: number): number => {
		if (n < 1) throw new Error(`glog(${n}): ${QRMath.glog(n)}`)
		return LOG_TABLE[n]
	},

	/**
	 * Exponential in GF(2^8): value of `α^n` in polynomial form.
	 * @param n Exponent (arbitrary; normalized modulo 255).
	 * @returns Value in polynomial form (0–255).
	 */
	gexp: (n: number): number => {
		while (n < 0) n += 255
		while (n >= 256) n -= 255
		return EXP_TABLE[n]
	},
}

/**
 * EXP_TABLE[i] = polynomial value of α^i (α = 0x02).
 */
const EXP_TABLE: number[] = Array.from({ length: 256 })

/**
 * LOG_TABLE[x] = exponent i whose α^i = x (inverse of {@link EXP_TABLE}).
 */
const LOG_TABLE: number[] = Array.from({ length: 256 })

/**
 * Both tables built in one pass: multiply α by x at each step (left shift),
 * reducing by the primitive polynomial 0x11d whenever 8 bits overflow.
 */
;(function initTables() {
	let x = 1
	for (let i = 0; i < 256; i++) {
		EXP_TABLE[i] = x
		LOG_TABLE[x] = i
		x <<= 1
		if (x & 0x100) x ^= 0x11d
	}
})()
