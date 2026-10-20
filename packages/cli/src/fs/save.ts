import fs from 'node:fs'
import path from 'node:path'

/**
 * File formats supported by `--output`.
 */
export type OutputFormat = 'png' | 'svg'

const SUPPORTED_FORMATS: OutputFormat[] = ['png', 'svg']

/**
 * Resolves the final destination of `--output`:
 * - Resolves the given path against CWD.
 * - Appends ".png" when no extension is present (default format).
 * - Validates that the extension is a supported format.
 * @param {string} outputPath - Path passed by the user.
 * @returns {{ absolutePath: string, format: OutputFormat }}
 */
export const resolveOutput = (
	outputPath: string
): { absolutePath: string; format: OutputFormat } => {
	let absolutePath = path.resolve(process.cwd(), outputPath)
	let ext = path.extname(absolutePath).slice(1).toLowerCase()

	if (ext === '') {
		absolutePath = `${absolutePath}.png`
		ext = 'png'
	}

	if (!SUPPORTED_FORMATS.includes(ext as OutputFormat)) {
		throw new Error(
			`Unsupported output format ".${ext}". Supported formats: ${SUPPORTED_FORMATS.join(', ')}.`
		)
	}

	return { absolutePath, format: ext as OutputFormat }
}

/**
 * Saves the generated QR bytes (PNG buffer or SVG string) to disk.
 * @param {Uint8Array | string} data - The image data.
 * @param {string} outputPath - The destination path provided by the user.
 * @returns {Promise<string>} The absolute path of the written file.
 */
export const saveQrFile = async (
	data: Uint8Array | string,
	outputPath: string
): Promise<string> => {
	const { absolutePath } = resolveOutput(outputPath)
	const dir = path.dirname(absolutePath)

	// Ensure the directory exists (mkdirSync with recursive is idempotent)
	fs.mkdirSync(dir, { recursive: true })
	await fs.promises.writeFile(absolutePath, data)
	return absolutePath
}
