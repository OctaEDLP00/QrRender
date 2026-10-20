import type { Component } from 'svelte'

/**
 * Props of `@qr-render/web/svelte` (mirrors `src/svelte/QRCode.svelte`).
 */
export interface QrCodeProps {
	/** Text to encode. */
	value: string
	/** Square edge in pixels. @default 256 */
	size?: number
	/** Error correction level. @default 'H' */
	level?: 'L' | 'M' | 'Q' | 'H'
	/** Dark module color. @default '#000000' */
	fgColor?: string
	/** Light module color. @default '#ffffff' */
	bgColor?: string
	/** Physical margin in pixels. @default 10 */
	margin?: number
	/** Quiet-zone modules per side. @default 4 */
	quietZone?: number
	/** Extra classes for the container. */
	class?: string
}

declare const QrCode: Component<QrCodeProps>

export default QrCode
