import QRCode from '../index.js'
import { useEffect, useRef } from 'preact/hooks'

/**
 * Props of the Preact `<QrCode />` component. Same vocabulary as the
 * imperative class, adapted to framework props (camelCase, strings for
 * levels).
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
	/** Visual roundness of the modules. @default 0 */
	roundness?: number
	/** Pixel threshold multiplier (see docs). @default 1 */
	pixelSize?: number
	/** Extra classes for the container div. */
	class?: string
}

/** level prop → ISO convention used by the core (M=0, L=1, H=2, Q=3). */
const LEVEL: Record<string, number> = { M: 0, L: 1, H: 2, Q: 3 }

/**
 * Preact wrapper of `@qr-render/web`: mounts the same Canvas renderer as the
 * vanilla playground (pixel-perfect grid, auto-versioning 1–40) and redraws
 * whenever a prop changes.
 */
export function QrCode(props: QrCodeProps) {
	const {
		value,
		size = 256,
		level = 'H',
		fgColor = '#000000',
		bgColor = '#ffffff',
		margin = 10,
		quietZone = 4,
		roundness = 0,
		pixelSize = 1,
	} = props
	const container = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!container.current) return
		const qr = new QRCode(container.current, {
			width: size,
			height: size,
			colorDark: fgColor,
			colorLight: bgColor,
			correctLevel: (LEVEL[level] ?? LEVEL.H) as never,
			margin,
			quietZone,
			roundness,
			pixelSize,
		})
		qr.makeCode(value)
		return () => {
			qr.clear()
		}
	}, [value, size, level, fgColor, bgColor, margin, quietZone, roundness, pixelSize])

	return (
		<div
			ref={container}
			class={props.class}
			style={`width:${size}px;height:${size}px`}
			title={value}
		/>
	)
}

export default QrCode
