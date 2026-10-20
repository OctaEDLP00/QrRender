/// <reference types="node" />
import { resolveOutput, saveQrFile, type OutputFormat } from './fs/save.js'
import { encodeQrPng } from './image/png.js'
import { encodeQrSvg } from './image/svg.js'
import { ConsoleDrawing } from './renderer/ConsoleDrawing.js'
import type { CLIErrorLevel, QRCodeOptionCLI } from './types.js'
import { QrErrorCorrectLevel, QRCodeModel } from '@qr-render/core'
import { Command } from 'commander'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

/**
 * Finds the minimum QR version required for the given data and error level.
 * @param {string} data - The text to encode.
 * @param {CLIErrorLevel} level - Error correction level.
 * @returns {number} The optimal version (1-40).
 */
const getOptimalVersion = (data: string, level: QrErrorCorrectLevel): number => {
	for (let v = 1; v <= 40; v++) {
		try {
			const testModel = new QRCodeModel(v, level)
			testModel.addData(data)
			testModel.make()
			return v
		} catch (e) {
			if (v === 40) throw new Error('Data too long for a standard QR Code.')
			continue
		}
	}
	return 4
}

/**
 * Normalizes a hex color to "#rrggbb" form (accepts "fff", "#fff", "ffffff").
 */
const normalizeHex = (value: string): string => {
	const hex = value.startsWith('#') ? value.slice(1) : value
	return hex.length === 3 ? `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : `#${hex}`
}

const program = new Command()

program.description('Professional QR Code generation in your terminal').version(packageJson.version)

program
	.argument('<text>', 'Text or URL to encode')
	.option('-s, --size <number>', 'Scale factor (1, 2, 3...)', v => parseInt(v, 10), 1)
	.option('-q, --quiet-zone <number>', 'Quiet zone (padding)', v => parseInt(v, 10), 4)
	.option('-l, --level <type>', 'Error correction level (L, M, Q, H)', 'M')
	.option('--dark <color>', 'ANSI (fg) for dark modules (hex like "#hex" for --output)', '\x1b[30m')
	.option(
		'--light <color>',
		'ANSI (fg) for light modules (hex like "#hex" for --output)',
		'\x1b[97m'
	)
	.option(
		'-o, --output <path>',
		'Save the QR code to a file instead of the terminal (formats: png, svg, autodetect extension, png by default)'
	)
	.action(async (text: string, options) => {
		try {
			const levelMap: Record<string, QrErrorCorrectLevel> = {
				L: QrErrorCorrectLevel.L,
				M: QrErrorCorrectLevel.M,
				Q: QrErrorCorrectLevel.Q,
				H: QrErrorCorrectLevel.H,
			}

			const selectedLevel = options.level.toUpperCase() as CLIErrorLevel
			if (!(selectedLevel in levelMap)) {
				throw new Error(`Invalid error level: ${options.level}. Use L, M, Q, or H.`)
			}

			const correctLevel = levelMap[selectedLevel]

			// 1. CLI option setup
			const cliOptions: Required<QRCodeOptionCLI> = {
				text,
				quietZone: options.quietZone ?? 4,
				correctLevel,
				colorDark: options.dark,
				colorLight: options.light,
				size: options.size,
			}

			// 2. Automatic version selection to avoid overflows
			const optimalVersion = getOptimalVersion(text, correctLevel)

			// 3. Generation of the real model
			const model = new QRCodeModel(optimalVersion, correctLevel)
			model.addData(text)
			model.make()

			// 4. File output (--output) or terminal rendering
			if (options.output) {
				const { absolutePath, format }: { absolutePath: string; format: OutputFormat } =
					resolveOutput(options.output)

				// For files, hex colors are used; if the user left the ANSI
				// defaults untouched, the standard colors apply
				const hexPattern = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/
				const imageOptions = {
					scale: options.size,
					quietZone: options.quietZone ?? 4,
					colorDark: hexPattern.test(options.dark) ? normalizeHex(options.dark) : '#000000',
					colorLight: hexPattern.test(options.light) ? normalizeHex(options.light) : '#ffffff',
				}

				const fileData =
					format === 'svg' ? encodeQrSvg(model, imageOptions) : encodeQrPng(model, imageOptions)

				await saveQrFile(fileData, absolutePath)
				process.stdout.write(`\x1b[32m✔ QR Code successfully saved at: ${absolutePath}\x1b[0m\n`)
				return
			}

			// 4a. Terminal rendering
			const terminal = new ConsoleDrawing(cliOptions)
			terminal.draw(model)
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error'
			process.stderr.write(`\x1b[31m[ERROR]\x1b[0m ${msg}\n`)
			process.exit(1)
		}
	})

program.parse()
