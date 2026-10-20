import { QRMath } from './QRMath.js'

/**
 * Class for handling operations with polynomials in Galois fields.
 * Essential for generating error correction blocks.
 */
export class QRPolynomial {
	private readonly num: number[]

	/**
	 *
	 * @param num
	 * @param shift
	 */
	constructor(num: number[], shift: number) {
		let offset = 0
		while (offset < num.length && num[offset] === 0) {
			offset++
		}

		// Optimizamos creando un array del tamaño exacto necesario
		this.num = new Array(num.length - offset + shift).fill(0)
		for (let i = 0; i < num.length - offset; i++) {
			this.num[i] = num[i + offset]
		}
	}

	/**
	 *
	 * @param index
	 * @returns number
	 */
	get(index: number): number {
		return this.num[index]
	}

	/**
	 *
	 * @returns number
	 */
	getLength(): number {
		return this.num.length
	}

	/**
	 * Multiply the current polynomial by another.
	 * @param e
	 * @returns QRPolynomial
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
	 * @returns QRPolynomial
	 */
	mod(e: QRPolynomial): QRPolynomial {
		if (this.getLength() - e.getLength() < 0) {
			return this
		}

		const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0))
		// Copia superficial suficiente para números primitivos
		const num = [...this.num]

		for (let i = 0; i < e.getLength(); i++) {
			num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio)
		}

		return new QRPolynomial(num, 0).mod(e)
	}
}
