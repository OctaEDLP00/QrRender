import QRCode from './index.js'
import type { QRCodeOptions, QrErrorCorrectLevel } from '@qr-render/core'

/**
 * Attributes observed by {@link QrCodeElement}; see the class doc for the
 * full list with defaults.
 */
const ATTRIBUTES = [
	'value',
	'size',
	'level',
	'fg-color',
	'bg-color',
	'margin',
	'quiet-zone',
	'roundness',
	'pixel-size',
]

const LEVELS: Record<string, number> = { M: 0, L: 1, H: 2, Q: 3 }

/**
 * Framework-agnostic web component: `<qr-code>` renders the exact same
 * Canvas pipeline as the main class (`@qr-render/web`), configured by plain
 * HTML attributes — usable from React, Preact, Astro, Vue or vanilla HTML.
 *
 * Importing the module auto-registers the element (guarded, idempotent), so
 * a plain `<script type="module">` is enough; call
 * {@link defineCustomElement} explicitly to use a custom tag name.
 *
 * Attributes:
 * - `value` (required): text to encode.
 * - `size`: square edge in pixels (default 256).
 * - `level`: `L | M | Q | H` (default `H`).
 * - `fg-color` / `bg-color`: module colors (default `#000000` / `#ffffff`).
 * - `margin`, `quiet-zone`, `roundness`, `pixel-size`: numeric tuning.
 *
 * @example
 * ```html
 * <script type="module" src="@qr-render/web/element"></script>
 * <qr-code value="https://example.com" size="192" level="Q"
 *          fg-color="#111827" bg-color="#f8fafc"></qr-code>
 * ```
 *
 * @example
 * ```ts
 * import { defineCustomElement } from '@qr-render/web/element'
 * defineCustomElement('mini-qr') // <mini-qr value="…"></mini-qr>
 * ```
 */
export class QrCodeElement extends HTMLElement {
	/** Preferred tag name when {@link defineCustomElement} is called without args. */
	static defaultTagName = 'qr-code'

	static get observedAttributes(): string[] {
		return ATTRIBUTES
	}

	#qr: QRCode | null = null

	constructor() {
		super()
		// `shadowRoot` es de solo lectura; attachShadow lo inicializa la primera vez.
		if (!this.shadowRoot) this.attachShadow({ mode: 'open' })
	}

	connectedCallback(): void {
		this.#render()
	}

	attributeChangedCallback(): void {
		if (this.isConnected && this.shadowRoot) this.#render()
	}

	disconnectedCallback(): void {
		this.#qr = null
	}

	/** Encoded text (mirrors the `value` attribute). */
	get value(): string {
		return this.getAttribute('value') ?? ''
	}

	set value(next: string) {
		this.setAttribute('value', next)
	}

	#options(): Partial<QRCodeOptions> & { text: string } {
		const attribute = (name: string): string | null => this.getAttribute(name)
		const number = (name: string, fallback: number): number => {
			const parsed = Number.parseFloat(attribute(name) ?? '')
			return Number.isFinite(parsed) ? parsed : fallback
		}
		const levelAttribute = (attribute('level') ?? 'H').toUpperCase()
		const level = LEVELS[levelAttribute] ?? LEVELS.H
		return {
			text: attribute('value') ?? '',
			width: number('size', 256),
			height: number('size', 256),
			colorDark: attribute('fg-color') ?? '#000000',
			colorLight: attribute('bg-color') ?? '#ffffff',
			correctLevel: level as QrErrorCorrectLevel,
			margin: number('margin', 10),
			quietZone: number('quiet-zone', 4),
			roundness: number('roundness', 0),
			pixelSize: number('pixel-size', 1),
		}
	}

	#render(): void {
		const shadowRoot = this.shadowRoot
		if (!shadowRoot) return
		const container = document.createElement('div')
		container.title = this.value
		shadowRoot.replaceChildren(container)
		try {
			this.#qr = new QRCode(container, this.#options())
		} catch (error) {
			container.textContent = `⚠ ${(error as Error).message}`
		}
	}
}

/**
 * Registers {@link QrCodeElement} in the global custom elements registry.
 * @param tag Tag name (defaults to `qr-code`).
 * @returns The tag name actually registered.
 * @example
 * ```js
 * import { defineCustomElement } from '@qr-render/web/element'
 * defineCustomElement('mini-qr')
 * ```
 */
export const defineCustomElement = (tag = QrCodeElement.defaultTagName): string => {
	if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
		customElements.define(tag, QrCodeElement)
	}
	return tag
}

// Auto-define en el import: `<script type="module" src="@qr-render/web/element">`
// is ready to use with no extra configuration.
if (typeof window !== 'undefined') {
	defineCustomElement()
}
