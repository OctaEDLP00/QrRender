import { QRCodeModel, type QrErrorCorrectLevel } from '@qr-render/core'

/**
 * Builds a QR model auto-selecting the version 1–40 classic-style: for each
 * candidate version it tries `make()`, and if it overflows (`Code length
 * overflow`) it continues with the next version — the same behavior as the
 * original qrcode.js with automatic typeNumber.
 *
 * Shared by every entry point of @qr-render/web (QRCode class, qrSvg and the
 * framework wrappers).
 * @param text Text to encode.
 * @param correctLevel Error correction level (ISO convention: M=0, L=1, H=2, Q=3).
 * @returns QRCodeModel with `make()` already applied.
 * @throws If the data does not fit version 40 with the chosen level.
 */
export const autoMakeModel = (text: string, correctLevel: QrErrorCorrectLevel): QRCodeModel => {
	let model: QRCodeModel | null = null
	for (let typeNumber = 1; typeNumber <= 40; typeNumber++) {
		const candidate = new QRCodeModel(typeNumber, correctLevel)
		candidate.addData(text)
		try {
			candidate.make()
		} catch {
			continue
		}
		model = candidate
		break
	}
	if (!model) {
		throw new Error('Data too long for QR version 40 with the selected error correction level')
	}
	return model
}
