import { autoMakeModel } from './autoMake.js'
import { CanvasDrawing } from './renderer/CanvasDrawing.js'
import { QRCodeModel, type QRCodeOptions } from '@qr-render/core'

/**
 * QR code generator class (the default export of `@qr-render/web`).
 *
 * It renders into an HTML element using the pixel-perfect Canvas pipeline
 * ({@link CanvasDrawing}): an integer-snapped grid, whole finder patterns and
 * no visible seams between modules. Version selection (1–40) is automatic,
 * shared with every other entry point through {@link autoMakeModel}.
 *
 * @example
 * ```ts
 * import QRCode from '@qr-render/web'
 *
 * const qr = new QRCode('#container', {
 *   width: 256,
 *   height: 256,
 *   text: 'https://example.com',
 * })
 * // Refresh the content without recreating the canvas:
 * qr.makeCode('Hola mundo')
 * ```
 */
export default class QRCode {
	private _htOption: Required<QRCodeOptions>
	private _el: HTMLElement
	private _oDrawing: CanvasDrawing
	private _model: QRCodeModel | null = null

	/**
	 * @param el Target element (or its element id) where the canvas is mounted.
	 * @param vOption Options object, or just the text to encode.
	 * @throws If `el` is a string id that does not match any element.
	 */
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
	 * Generates a new QR code with the given text, replacing the previous
	 * content on the same canvas.
	 * @param sText Text to encode.
	 * @throws If the data does not fit version 40 (classic overflow behavior).
	 * @returns void
	 */
	makeCode(sText: string): void {
		this._htOption.text = sText
		this._model = autoMakeModel(sText, this._htOption.correctLevel)
		this._el.title = sText
		this._oDrawing.draw(this._model)
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
