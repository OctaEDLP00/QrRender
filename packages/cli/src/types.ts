import type { QrErrorCorrectLevel } from '@qr-render/core'

/**
 * CLI Specific options.
 * We omit visual properties that only apply to Canvas/Web renderers.
 */
export interface QRCodeOptionCLI {
	/**
	 * Text to be encoded.
	 */
	text: string
	/**
	 * Error correction level for the QR model.
	 */
	correctLevel?: QrErrorCorrectLevel
	/**
	 * ANSI escape (first plan) used to paint dark modules.
	 * @default '\x1b[30m'
	 */
	colorDark?: string
	/**
	 * ANSI escape (first plan) used to paint light modules.
	 * @default '\x1b[97m'
	 */
	colorLight?: string
	/**
	 * Quiet zone (padding) in modules around the code.
	 * @default 4
	 */
	quietZone?: number
	/**
	 * Scale factor for the module size in the terminal.
	 * @default 1
	 */
	size?: number
}

/**
 * Utility type to allow string-based levels in CLI arguments
 */
export type CLIErrorLevel = 'L' | 'M' | 'Q' | 'H'
