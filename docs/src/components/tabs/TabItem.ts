/**
 * A single panel of a `<qr-tabs>` group (Starlight-style `TabItem`, done as a
 * real web component).
 *
 * The label drives the tab button rendered by the parent `<qr-tabs>`; the slot
 * content is the visible panel. Panels are shown/hidden by the parent via the
 * native `hidden` attribute.
 *
 * @example
 *   <qr-tab-item label="Terminal">
 *     <pre><code>qr "https://example.com"</code></pre>
 *   </qr-tab-item>
 *
 * @extends HTMLElement
 * @fires qr-tab-label-change - When the mirrored `label` attribute changes.
 */
export class QRTabItemElement extends HTMLElement {
	constructor() {
		super()
		this.attachShadow({ mode: 'open' })
	}

	/** Registers the tag once. */
	static define(tag = 'qr-tab-item', registry = customElements) {
		if (!registry.get(tag)) {
			registry.define(tag, this)
		}
		return this
	}

	static get observedAttributes() {
		return ['label']
	}

	/** Mirrored `label` attribute (required; drives the parent tab button). */
	get label(): string {
		return this.getAttribute('label') ?? ''
	}

	set label(value: string) {
		if (value) {
			this.setAttribute('label', value)
		} else {
			this.removeAttribute('label')
		}
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
		if (name === 'label' && oldValue !== newValue) {
			if (!this.label) {
				console.warn(
					"Missing attribute `label` on <qr-tab-item> (Starlight's TabItem requires it)."
				)
			}
			this.dispatchEvent(new CustomEvent('qr-tab-label-change', { bubbles: true, composed: true }))
		}
	}

	connectedCallback(): void {
		if (!this.label) {
			console.warn("Missing attribute `label` on <qr-tab-item> (Starlight's TabItem requires it).")
		}
		this.render()
	}

	static get styles(): string {
		return /* css */ `
      :host {
        display: block;
      }
      :host([hidden]) {
        display: none;
      }
    `
	}

	render(): void {
		if (!this.shadowRoot) return

		this.shadowRoot.setHTMLUnsafe(/* html */ `
        <style>${QRTabItemElement.styles}</style>
        <div class="panel" part="panel">
          <slot></slot>
        </div>
      `)
	}
}

const root = (typeof globalThis !== 'undefined' ? globalThis : window) as typeof window

try {
	root.QRTabItemElement = QRTabItemElement.define()
} catch (e: unknown) {
	if (
		!(root.DOMException && e instanceof DOMException && e.name === 'NotSupportedError') &&
		!(e instanceof ReferenceError)
	) {
		throw e
	}
}
