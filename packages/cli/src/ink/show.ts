import { Box, render } from 'ink'
import Image, { InkPictureProvider } from 'ink-picture'
import type { ImageProps } from 'ink-picture'
import { createElement, type ReactNode } from 'react'

/**
 * Terminal image display built on Ink + ink-picture.
 *
 * `--ink` (SVG rasterized on the fly) and `--ink-picture` (PNG) both land here:
 * ink-picture detects the best protocol of the running terminal — Kitty,
 * iTerm2 inline images, Sixel — and falls back to unicode half-blocks,
 * Braille or ASCII art in plain terminals.
 */

/**
 * Options for the on-screen image render.
 */
export interface InkImageOptions {
	/**
	 * PNG bytes to display (Jimp-readable; the SVG path gets rasterized first).
	 */
	buffer: Buffer
	/**
	 * Image width in terminal cells.
	 */
	width: number
	/**
	 * Image height in terminal cells.
	 */
	height: number
	/**
	 * Empty terminal cells (Ink Box padding) around the image.
	 */
	margin: number
	/**
	 * Accessible description (also shown on load/error).
	 */
	alt?: string
}

/**
 * Jimp-readable image source expected by ink-picture.
 */
type ImageSource = ImageProps['src']

/**
 * Renders the QR image bytes in the terminal and waits until the user exits
 * (Ctrl+C) or Ink unmounts, so protocols keep their screen clean afterwards.
 * @param {InkImageOptions} options — Bytes, size in cells and margin.
 */
export const showQrImage = async ({
	buffer,
	width,
	height,
	margin,
	alt = 'QR Code',
}: InkImageOptions): Promise<void> => {
	const source = buffer as ImageSource
	const tree = createElement(
		Box,
		{ flexDirection: 'column', alignItems: 'center', paddingX: margin, paddingY: margin },
		createElement(
			InkPictureProvider,
			null,
			createElement(Image, { src: source, width, height, alt, objectFit: 'contain' })
		)
	)
	const instance = render(tree, { exitOnCtrlC: true })
	await instance.waitUntilExit()
}
