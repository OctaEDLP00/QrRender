/// <reference types="node" />
import { resolveOutput, saveQrFile, type OutputFormat } from './fs/save.js'
import { encodePngFromRgb, encodeQrPng, type QrImageOptions } from './image/png.js'
import { rasterizeSvgRgb } from './image/raster.js'
import { encodeQrSvg } from './image/svg.js'
import { showQrImage } from './ink/show.js'
import { ConsoleDrawing } from './renderer/ConsoleDrawing.js'
import type { CLIErrorLevel, QRCodeOptionCLI } from './types.js'
import { buildWiFiString, type WiFiSecurity } from './wifi.js'
import { QrErrorCorrectLevel, QRCodeModel } from '@qr-render/core'
import { Command, type Command as CommanderCommand } from 'commander'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

/**
 * Error correction levels accepted by the CLI flags, in ISO order.
 */
const LEVELS: Record<CLIErrorLevel, QrErrorCorrectLevel> = {
	L: QrErrorCorrectLevel.L,
	M: QrErrorCorrectLevel.M,
	Q: QrErrorCorrectLevel.Q,
	H: QrErrorCorrectLevel.H,
}

/**
 * Security types accepted by the `wifi` subcommand.
 */
const SECURITY_TYPES: WiFiSecurity[] = ['WPA', 'WEP', 'nopass']

/** The --dark/--light defaults are ANSI sequences; these are the raster colors. */
const TERMINAL_DEFAULT_DARK = '#000000'
const TERMINAL_DEFAULT_LIGHT = '#ffffff'
const HEX = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/

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

/**
 * Shared rendering options (generation + output) for the main command and
 * the `wifi` subcommand. `--help` has no short alias so `-h` stays free
 * for `--height`.
 * @param {CommanderCommand} cmd - Commander command to decorate.
 * @returns {CommanderCommand} The same command, with options chained.
 */
const withRenderOptions = (cmd: CommanderCommand): CommanderCommand =>
	cmd
		.option('-s, --size <number>', 'Scale factor (1, 2, 3...)', v => parseInt(v, 10), 1)
		.option('-q, --quiet-zone <number>', 'Quiet zone (padding)', v => parseInt(v, 10), 4)
		.option('-l, --level <type>', 'Error correction level (L, M, Q, H)', 'M')
		.option(
			'--dark <color>',
			'ANSI (fg) for dark modules (hex like "#hex" for --output)',
			'\x1b[30m'
		)
		.option(
			'--light <color>',
			'ANSI (fg) for light modules (hex like "#hex" for --output)',
			'\x1b[97m'
		)
		.option(
			'-o, --output <path>',
			'Save the QR code to a file (formats: png, svg, autodetect extension, png by default)'
		)
		/*
		 * Picture options only make sense with --ink/--ink-picture; the action
		 * rejects them otherwise ("solo si se pone --ink").
		 */
		.option(
			'-m, --margin <number>',
			'Terminal cells of margin around the picture (only with --ink/--ink-picture)',
			v => parseInt(v, 10),
			0
		)
		.option(
			'-w, --width <number>',
			'Picture width in terminal cells (only with --ink/--ink-picture)',
			v => parseInt(v, 10),
			32
		)
		.option(
			'-h, --height <number>',
			'Picture height in terminal cells (only with --ink/--ink-picture)',
			v => parseInt(v, 10),
			32
		)
		.option(
			'--ink',
			'Show the QR on screen as a picture (SVG source rasterized on the fly; protocol auto-detected: kitty/iTerm2/sixel/half-blocks)'
		)
		.option(
			'--ink-picture',
			'Show the QR on screen as a picture (PNG source; protocol auto-detected)'
		)

/**
 * Renders (or saves) the QR for a payload. Shared by the main command and
 * the `wifi` subcommand so both support the same display/saving flags.
 * @param {string} text - Payload to encode.
 * @param {Record<string, any>} options - Parsed option values.
 * @param {CommanderCommand} command - Owning command (to inspect option sources).
 */
const renderQr = async (
	text: string,
	options: Record<string, any>,
	command: CommanderCommand
): Promise<void> => {
	const inkMode = Boolean(options.ink || options.inkPicture)

	/*
	 * -m/-w/-h belong to the picture flow only; catching misuse early keeps
	 * the silent "these do nothing" footgun away.
	 */
	const pictureOnlyOptions = ['margin', 'width', 'height']
	const misused = pictureOnlyOptions.filter(
		option => command.getOptionValueSource(option) === 'cli' && !inkMode
	)
	if (misused.length > 0) {
		throw new Error(
			`Only applicable with --ink or --ink-picture: ${misused.map(option => `--${option}`).join(', ')}`
		)
	}

	const selectedLevel = (String(options.level).toUpperCase() || 'M') as CLIErrorLevel
	if (!(selectedLevel in LEVELS)) {
		throw new Error(`Invalid error level: ${options.level}. Use L, M, Q, or H.`)
	}
	const correctLevel = LEVELS[selectedLevel]

	const cliOptions: Required<QRCodeOptionCLI> = {
		text,
		quietZone: options.quietZone ?? 4,
		correctLevel,
		colorDark: options.dark,
		colorLight: options.light,
		size: options.size,
	}

	// Automatic version selection to avoid overflows
	const optimalVersion = getOptimalVersion(text, correctLevel)
	const model = new QRCodeModel(optimalVersion, correctLevel)
	model.addData(text)
	model.make()

	/*
	 * Hex pair the raster (file and picture) encoders use; the ANSI terminal
	 * defaults are kept untouched unless the user typed a hex color.
	 */
	const imageOptions: QrImageOptions = {
		scale: cliOptions.size,
		quietZone: cliOptions.quietZone,
		colorDark: HEX.test(options.dark) ? normalizeHex(options.dark) : TERMINAL_DEFAULT_DARK,
		colorLight: HEX.test(options.light) ? normalizeHex(options.light) : TERMINAL_DEFAULT_LIGHT,
	}

	if (options.output) {
		const { absolutePath, format }: { absolutePath: string; format: OutputFormat } = resolveOutput(
			options.output
		)

		const fileData =
			format === 'svg' ? encodeQrSvg(model, imageOptions) : encodeQrPng(model, imageOptions)

		await saveQrFile(fileData, absolutePath)
		process.stdout.write(`\x1b[32m✔ QR Code successfully saved at: ${absolutePath}\x1b[0m\n`)
		if (!inkMode) return
	}

	if (inkMode) {
		// --ink runs the SVG document through the rasterizer first (jimp can't
		// read SVG); --ink-picture feeds the PNG bytes to Jimp directly.
		if (options.ink) {
			const { size, rgb } = rasterizeSvgRgb(encodeQrSvg(model, imageOptions))
			await showQrImage({
				buffer: encodePngFromRgb(size, rgb),
				width: options.width,
				height: options.height,
				margin: options.margin,
				alt: 'QR Code',
			})
			return
		}
		await showQrImage({
			buffer: encodeQrPng(model, imageOptions),
			width: options.width,
			height: options.height,
			margin: options.margin,
			alt: 'QR Code',
		})
		return
	}

	// Terminal rendering (ANSI) fallback
	new ConsoleDrawing(cliOptions).draw(model)
}

const program = new Command()

program
	.description('Professional QR Code generation in your terminal')
	.helpOption('--help', 'Show help')

program.version(packageJson.version)

/**
 * `wifi` subcommand: composes the credentials string per the ZXing
 * convention (SSID first, reserved characters escaped) and renders it
 * through the same flags as any other payload.
 */
const wifiCommand = withRenderOptions(
	new Command('wifi')
		.description(
			'Render a WiFi credentials QR: builds the WIFI: string for you (SSID first, values escaped per ZXing) and displays/saves it like any other code'
		)
		.requiredOption(
			'--ssid <text>',
			'Network SSID (case-sensitive, exactly as the router exposes it)'
		)
		.option('-p, --password <text>', 'Pre-shared key (ignored with --type nopass)', '')
		.option('-t, --type <security>', 'Security type: WPA, WEP or nopass', 'WPA')
		.option('--hidden', 'Mark the SSID as hidden (adds H:true)', false)
).action(async (options: Record<string, any>, command: CommanderCommand) => {
	try {
		const security = String(options.type).toUpperCase()
		if (!SECURITY_TYPES.includes(security as WiFiSecurity)) {
			throw new Error(`Invalid security type: ${options.type}. Use WPA, WEP or nopass.`)
		}
		const text = buildWiFiString({
			ssid: options.ssid,
			password: options.password,
			security: security as WiFiSecurity,
			hidden: Boolean(options.hidden),
		})
		process.stderr.write(`\x1b[2mℹ String credenciales: ${text}\x1b[0m\n`)
		await renderQr(text, options, command)
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Unknown error'
		process.stderr.write(`\x1b[31m[ERROR]\x1b[0m ${msg}\n`)
		process.exit(1)
	}
})
/*
 * Both flows live in subcommands ("qr" is the default one) so each owns its
 * option set: flags registered twice (root + subcommand) get shadowed by
 * commander and the subcommand loses its value at parse time.
 */
program.addCommand(wifiCommand)

/*
 * "qr" is the default command (runs even without its name) and `program.command()`
 * already registers it, so it must not be added again explicitly.
 */
withRenderOptions(
	program
		.command('qr', { isDefault: true })
		.description('Text, URL or WIFI: string to encode (the default command runs even namelessly)')
		.argument('<text>', 'Text, URL or WIFI: string to encode')
).action(async (text: string, options: Record<string, any>, command: CommanderCommand) => {
	try {
		await renderQr(text, options, command)
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Unknown error'
		process.stderr.write(`\x1b[31m[ERROR]\x1b[0m ${msg}\n`)
		process.exit(1)
	}
})

program.parse()
