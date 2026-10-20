<script lang="ts">
	import QRCode from '@qr-render/web'

	/**
	 * Svelte 5 wrapper (@qr-render/web/svelte). Same Canvas pipeline as the
	 * vanilla playground; redraws whenever a prop changes.
	 */
	interface Props {
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
	}

	type QrProps = Props & { class?: string }

	let {
		value,
		size = 256,
		level = 'H',
		fgColor = '#000000',
		bgColor = '#ffffff',
		margin = 10,
		quietZone = 4,
		...rest
	}: QrProps = $props()

	let container = $state<HTMLDivElement | null>(null)

	const LEVEL: Record<string, number> = { M: 0, L: 1, H: 2, Q: 3 }

	$effect(() => {
		if (!container) return
		const qr = new QRCode(container, {
			width: size,
			height: size,
			colorDark: fgColor,
			colorLight: bgColor,
			correctLevel: (LEVEL[level] ?? LEVEL.H) as never,
			margin,
			quietZone,
		})
		qr.makeCode(value)
		return () => {
			qr.clear()
		}
	})
</script>

<div bind:this={container} title={value} style="width: {size}px; height: {size}px" {...rest}></div>
