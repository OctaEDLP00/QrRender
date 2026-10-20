import type { QrImageOptions } from './png.js'
import type { QRCodeModel } from '@qr-render/core'

/**
 * Renders a QR model into a standalone SVG document string.
 * Zero dependencies; each dark module is a crisp <rect>.
 * @param {QRCodeModel} model - Generated model (make() must have been called).
 * @param {QrImageOptions} options - Scale, colors and quiet zone.
 */
export const encodeQrSvg = (model: QRCodeModel, options: QrImageOptions = {}): string => {
	const scale = Math.max(1, Math.floor(options.scale ?? 1))
	const quietZone = Math.max(0, Math.floor(options.quietZone ?? 4))
	const colorDark = options.colorDark ?? '#000000'
	const colorLight = options.colorLight ?? '#ffffff'
	const moduleCount = model.getModuleCount()
	const total = (moduleCount + quietZone * 2) * scale

	const rects: string[] = [`<rect width="${total}" height="${total}" fill="${colorLight}"/>`]

	for (let row = 0; row < moduleCount; row++) {
		for (let col = 0; col < moduleCount; col++) {
			if (!model.isDark(row, col)) continue
			const x = (col + quietZone) * scale
			const y = (row + quietZone) * scale
			rects.push(`<rect x="${x}" y="${y}" width="${scale}" height="${scale}" fill="${colorDark}"/>`)
		}
	}

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">`,
		...rects,
		`</svg>`,
	].join('')
}
