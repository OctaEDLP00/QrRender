import { QRMath } from './QRMath.js'

/**
 * Polynomial over GF(2^8) with implicit leading-zero trimming; the workhorse
 * of the Reed–Solomon encoder: multiplies data polynomials by the generator
 * (`multiply`) and performs long division (`mod`) to obtain the ECC bytes.
 */
export class QRPolynomial {
	private readonly num: number[]

	/**
	 * @param num Coefficients (highest degree first); leading zeros are dropped.
	 * @param shift How many low-degree zero coefficients to append (multiply by x^shift).
	 */
	constructor(num: number[], shift: number) {
		let offset = 0
		while (offset < num.length && num[offset] === 0) {
			offset++
		}

		// Optimize by creating an array of the exact needed size
		this.num = new Array(num.length - offset + shift).fill(0)
		for (let i = 0; i < num.length - offset; i++) {
			this.num[i] = num[i + offset]
		}
	}

	/**
	 * Coefficient at `index` (highest degree first).
	 */
	get(index: number): number {
		return this.num[index]
	}

	/**
	 * @returns Amount of stored coefficients (degree + 1).
	 */
	getLength(): number {
		return this.num.length
	}

	/**
	 * Multiply the current polynomial by another (GF(2^8) convolution):
	 * per-coefficient products become XORs after exp/log lookups.
	 * @param e Polynomial factor.
	 * @returns The expanded product, trimmed of leading zeros.
	 */
	multiply(e: QRPolynomial): QRPolynomial {
		const length = this.getLength() + e.getLength() - 1
		const num = Array.from({ length }).fill(0) as Array<number>

		for (let i = 0; i < this.getLength(); i++) {
			for (let j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)))
			}
		}
		return new QRPolynomial(num, 0)
	}

	/**
	 * Calculate the remainder of the division (modulo) to obtain the correction bytes.
	 * Divides `this` by `e` (the RS generator) in GF(2^8): each step cancels
	 * the current leading term with a degree-aligned XOR, then recurses until
	 * the remainder degree is below the divisor's.
	 * @param e Divisor polynomial (the Reed–Solomon generator).
	 * @returns Remainder polynomial; its coefficients are the ECC bytes.
	 */
	mod(e: QRPolynomial): QRPolynomial {
		if (this.getLength() - e.getLength() < 0) {
			return this
		}

		const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0))
		// Shallow copy is enough for primitive numbers
		const num = [...this.num]

		for (let i = 0; i < e.getLength(); i++) {
			num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio)
		}

		return new QRPolynomial(num, 0).mod(e)
	}
}
