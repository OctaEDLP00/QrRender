import type { QRCodeOptionCLI } from '../types.js'
import { QRCodeModel } from '@qr-render/core'

/**
 * Console-based renderer for CLI environments.
 *
 * Renders modules as buffered ("██") of first plan paint (arguments colorDark /
 * colorLight) instead of background-color blocks: the block glyph covers the
 * cell completely, so no seams/background borders between the rendered cell rectangles.
 */
export class ConsoleDrawing {
	private _options: Required<QRCodeOptionCLI>
	private static readonly BLOCK = '██'
	private static readonly RESET = '\x1b[0m'
	private static readonly DEFAULT_DARK = '\x1b[30m'
	private static readonly DEFAULT_LIGHT = '\x1b[97m'

	/**
	 * @param {Required<QRCodeOptionCLI>} vOption
	 */
	constructor(vOption: Required<QRCodeOptionCLI>) {
		this._options = vOption
	}

	/**
	 * Draws the QR Code in the terminal using full-block glyphs (fg-based).
	 * @param model
	 */
	draw(model: QRCodeModel): void {
		const moduleCount = model.getModuleCount()
		const quietZone = Math.max(0, this._options.quietZone)
		const colorDark = this._options.colorDark || ConsoleDrawing.DEFAULT_DARK
		const colorLight = this._options.colorLight || ConsoleDrawing.DEFAULT_LIGHT
		const RESET = ConsoleDrawing.RESET

		let output = '\n'

		for (let row = -quietZone; row < moduleCount + quietZone; row++) {
			let line = ''
			let current: string | null = null

			for (let col = -quietZone; col < moduleCount + quietZone; col++) {
				const isInside = row >= 0 && row < moduleCount && col >= 0 && col < moduleCount
				const paint = isInside && model.isDark(row, col) ? colorDark : colorLight
				// Solo emitimos la secuencia ANSI cuando cambia de color (runs agrupados)
				if (paint !== current) {
					line += RESET + paint
					current = paint
				}
				line += ConsoleDrawing.BLOCK
			}

			output += line + RESET + '\n'
		}

		process.stdout.write(output + '\n')
	}

	/**
	 * Clears the terminal screen.
	 */
	clear(): void {
		process.stdout.write('\x1b[2J\x1b[0f')
	}
}
