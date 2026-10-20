export type Component<T> = (_props: T) => any

export interface QrCodeProps {
	/** Text to encode. */
	value: string
	/** Square edge in pixels. @default 256 */
	size?: number | undefined
	/** Error correction level. @default 'H' */
	level?: 'L' | 'M' | 'Q' | 'H' | undefined
	/** Dark module color. @default '#111827' */
	fgColor?: string | undefined
	/** Light module color. @default '#f8fafc' */
	bgColor?: string | undefined
	/** Physical margin in pixels. @default 10 */
	margin?: number | undefined
	/** Quiet-zone modules per side. @default 4 */
	quietZone?: number | undefined
	/** Extra classes for the svg. */
	class?: string | undefined
}
