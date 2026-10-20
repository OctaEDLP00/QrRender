/**
 * A tab group (Starlight-style `Tabs`, done as a real web component).
 *
 * Builds an accessible tablist from its `<qr-tab-item>` children — the light-DOM
 * panels stay put, only the buttons live in the shadow root. Follows the
 * WAI-ARIA tabs pattern (roving tabindex, arrow keys, Home/End).
 *
 * With `sync-key`, every group sharing the key on the page moves together and
 * the selection is persisted into `localStorage`, so it survives navigation —
 * same idea as Starlight's synced tabs.
 *
 * @example
 *   <qr-tabs sync-key="pkg">
 *     <qr-tab-item label="pnpm">…</qr-tab-item>
 *     <qr-tab-item label="npm">…</qr-tab-item>
 *   </qr-tabs>
 *
 * @extends HTMLElement
 * @fires change - {detail: {index, label}} After the active tab changes.
 * @attribute sync-key — Optional key to sync and persist this group.
 */
import type { QRTabItemElement } from './TabItem.js'

export class QRTabsElement extends HTMLElement {
	/** Live registry of groups sharing a `sync-key`, for cross-group sync. */
	static #syncedTabs = new Map<string, QRTabsElement[]>()
	/** Page-level counter so ids stay unique when several groups coexist. */
	static #instanceCount = 0

	#syncKey: string | null = null
	#uid = ''
	#index = 0
	#buttons: HTMLButtonElement[] = []
	#items: QRTabItemElement[] = []
	/** Storage key prefix must match the restore logic. */
	#storageKeyPrefix = 'qr-render-tabs__'
	/** Stable ref so the label-change listener can be removed in `disconnectedCallback`. */
	#onLabelChange = () => this.render()

	constructor() {
		super()
		this.attachShadow({ mode: 'open' })
	}

	/** Registers the tag once. */
	static define(tag = 'qr-tabs', registry = customElements) {
		if (!registry.get(tag)) {
			registry.define(tag, this)
		}
		return this
	}

	static get observedAttributes() {
		return ['sync-key']
	}

	/** Live index of the active panel. */
	get activeIndex(): number {
		return this.#index
	}

	/** Item count, safe to read before upgrade of the children. */
	get length(): number {
		return this.#collectItems().length
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
		if (name === 'sync-key' && oldValue !== newValue && this.isConnected) {
			this.#unregister()
			this.#syncKey = newValue
			this.#register()
		}
	}

	connectedCallback(): void {
		this.#uid = `qr-tabs-${++QRTabsElement.#instanceCount}`
		this.#syncKey = this.getAttribute('sync-key')
		this.render()

		// Rerender the tablist when a child changes its label at runtime.
		this.addEventListener('qr-tab-label-change', this.#onLabelChange)

		this.#restoreSynced()
		this.#register()
	}

	disconnectedCallback(): void {
		this.removeEventListener('qr-tab-label-change', this.#onLabelChange)
		this.#unregister()
	}

	/**
	 * Selects a tab by index (clamped) and syncs/persists by `label`.
	 * @param {number} index
	 * @param {{ propagate?: boolean }} [options] `false` skips sibling sync/persist.
	 */
	select(index: number, { propagate = true } = {}): void {
		const items = this.#collectItems()
		const next = Math.min(Math.max(index, 0), Math.max(items.length - 1, 0))
		const item = items[next]
		if (!item) return

		this.#index = next
		this.#buttons.forEach((button, i) => {
			const selected = i === next
			button.setAttribute('aria-selected', String(selected))
			button.tabIndex = selected ? 0 : -1
		})
		items.forEach((el, i) => {
			el.role = 'tabpanel'
			el.id = `${this.#uid}-panel-${i}`
			el.setAttribute('aria-labelledby', `${this.#uid}-tab-${i}`)
			el.hidden = i !== next
		})

		const label = item.label.trim()
		if (!propagate) return

		this.dispatchEvent(
			new CustomEvent('change', {
				detail: { index: next, label },
				bubbles: true,
				composed: true,
			})
		)

		if (this.#syncKey) {
			for (const other of QRTabsElement.#syncedTabs.get(this.#syncKey) ?? []) {
				if (other !== this) other.#selectByLabel(label, { propagate: false })
			}
			try {
				localStorage.setItem(this.#storageKeyPrefix + this.#syncKey, label)
			} catch {
				/* SSR, private mode…: persistence is best effort. */
			}
		}
	}

	/** Rebuilds the tablist (collects items, renders shadow, applies selection). */
	render(): void {
		this.#collectItems()
		if (!this.shadowRoot) return

		const tabs = this.#items
			.map((item, i) => {
				const label = item.label.trim() || `Tab ${i + 1}`
				return `
          <button
            role="tab"
            id="${this.#uid}-tab-${i}"
            aria-controls="${this.#uid}-panel-${i}"
            aria-selected="${i === 0}"
            tabindex="${i === 0 ? 0 : -1}"
          >
            ${label.replace(/</g, '&lt;')}
          </button>`
			})
			.join('')

		this.shadowRoot.setHTMLUnsafe(/* html */ `
        <style>${QRTabsElement.styles}</style>
        <div class="tablist-wrapper" part="tablist-wrapper">
          <div role="tablist" part="tablist">${tabs}</div>
        </div>
        <slot></slot>
      `)

		this.#buttons = [...this.shadowRoot.querySelectorAll('button')]
		if (this.#buttons.length > 0) {
			this.#bindTablist()
			this.select(this.#index, { propagate: false })
		}
	}

	static get styles(): string {
		return /* css */ `
      :host {
        display: block;
        font-family: inherit;
      }
      .tablist-wrapper {
        overflow-x: auto;
        /* Respiro entre la línea inferior del tablist y el panel (Starlight:
           margin-top 1rem sobre el panel). */
        margin-bottom: 1rem;
      }
      [role='tablist'] {
        display: flex;
        gap: 0.25rem;
        border-bottom: 2px solid var(--border, #243247);
        padding: 0;
      }
      [role='tab'] {
        appearance: none;
        border: 0;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        padding: 0.4rem 1rem;
        background: transparent;
        color: var(--text-dim, #93a4b8);
        font: inherit;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        white-space: nowrap;
        cursor: pointer;
        border-radius: 4px 4px 0 0;
        transition:
          color 0.15s ease,
          border-color 0.15s ease;
      }
      [role='tab']:hover {
        color: var(--text, #e6edf3);
      }
      [role='tab'][aria-selected='true'] {
        color: var(--text, #e6edf3);
        font-weight: 600;
        border-bottom-color: var(--accent, #4ec9b0);
      }
      [role='tab']:focus-visible {
        outline: 2px solid var(--accent-2, #7aa2f7);
        outline-offset: -2px;
      }
    `
	}

	#collectItems(): QRTabItemElement[] {
		this.#items = [...this.querySelectorAll<QRTabItemElement>(':scope > qr-tab-item')]
		return this.#items
	}

	#bindTablist(): void {
		const tablist = this.shadowRoot?.querySelector('[role="tablist"]')
		if (!tablist) return

		tablist.addEventListener('click', e => {
			const target = e.target as HTMLElement
			const button = target.closest('button')
			if (button) this.select(this.#buttons.indexOf(button))
		})

		tablist.addEventListener('keydown', (ev: Event) => {
			const e = ev as KeyboardEvent
			const count = this.#buttons.length
			const key = e.key as 'ArrowRight' | 'ArrowLeft' | 'Home' | 'End'
			const next = {
				ArrowRight: (this.#index + 1) % count,
				ArrowLeft: (this.#index - 1 + count) % count,
				Home: 0,
				End: count - 1,
			}[key]
			if (next === undefined) return
			e.preventDefault()
			this.select(next)
			this.#buttons[next].focus()
		})
	}

	/** Restores the persisted active tab for this `sync-key`, if any. */
	#restoreSynced(): void {
		if (!this.#syncKey || typeof localStorage === 'undefined') return
		let label: string | null = null
		try {
			label = localStorage.getItem(this.#storageKeyPrefix + this.#syncKey)
		} catch {
			return
		}
		if (!label) return
		this.#selectByLabel(label, { propagate: false })
	}

	#selectByLabel(label: string, options?: { propagate?: boolean }): void {
		const index = this.#collectItems().findIndex(item => item.label.trim() === label)
		if (index > 0) this.select(index, options)
	}

	#register(): void {
		if (!this.#syncKey || !this.isConnected) return
		const groups = QRTabsElement.#syncedTabs.get(this.#syncKey) ?? []
		groups.push(this)
		QRTabsElement.#syncedTabs.set(this.#syncKey, groups)
	}

	#unregister(): void {
		if (!this.#syncKey) return
		const groups = QRTabsElement.#syncedTabs.get(this.#syncKey) ?? []
		QRTabsElement.#syncedTabs.set(
			this.#syncKey,
			groups.filter(group => group !== this)
		)
	}
}

const root = (typeof globalThis !== 'undefined' ? globalThis : window) as typeof window

try {
	root.QRTabsElement = QRTabsElement.define()
} catch (e: unknown) {
	if (
		!(root.DOMException && e instanceof DOMException && e.name === 'NotSupportedError') &&
		!(e instanceof ReferenceError)
	) {
		throw e
	}
}
