import { CanvasDrawing } from './renderer/CanvasDrawing.js'
import { QRCodeModel } from '@qr-render/core'
import type { QRCodeOptions } from '@qr-render/core'

/**
 * QRCode generator class.
 */
export default class QRCode {
	private _htOption: Required<QRCodeOptions>
	private _el: HTMLElement
	private _oDrawing: CanvasDrawing
	private _model: QRCodeModel | null = null

	constructor(el: HTMLElement | string, vOption: string | Partial<QRCodeOptions>) {
		this._htOption = {
			width: 256,
			height: 256,
			colorDark: '#000000',
			colorLight: '#ffffff',
			correctLevel: 2,
			margin: 10,
			roundness: 0,
			quietZone: 4,
			pixelSize: 1,
			text: '',
			...(typeof vOption === 'string' ? { text: vOption } : vOption),
		}

		if (typeof el === 'string') {
			const element = document.getElementById(el)
			if (!element) throw new Error(`Element with id "${el}" not found`)
			this._el = element
		} else {
			this._el = el
		}

		this._oDrawing = new CanvasDrawing(this._el, this._htOption)

		if (this._htOption.text) {
			this.makeCode(this._htOption.text)
		}
	}

	/**
	 * Generate the QR code with new text.
	 * @param sText Texto a codificar
	 * @returns void
	 */
	makeCode(sText: string): void {
		this._htOption.text = sText

		// Auto-selección de versión: con los datos y el nivel elegido cada
		// versión intenta (make()). Si una versión desborda, QRCodeModel lanza
		// 'Code length overflow' y probamos la siguiente — el comportamiento
		// clásico de qrcode.js con typeNumber automático.
		let model: QRCodeModel | null = null
		for (let typeNumber = 1; typeNumber <= 40; typeNumber++) {
			const candidate = new QRCodeModel(typeNumber, this._htOption.correctLevel)
			candidate.addData(sText)
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
		this._model = model

		this._el.title = sText
		this._oDrawing.draw(model)
	}

	/**
	 * The generated QR model (make() already applied), exposed so consumers can
	 * build their own outputs (SVG, terminal, etc.) from the same matrix.
	 * @returns QRCodeModel | null, or null if never generated.
	 */
	get model(): QRCodeModel | null {
		return this._model
	}

	/**
	 * Clean up the graphic content.
	 * @returns void
	 */
	clear(): void {
		this._oDrawing.clear()
	}
}

if (typeof window !== 'undefined') {
	;(window as any).QRCode = QRCode
}
