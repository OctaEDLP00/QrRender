// docs/src/components/tabs/TabItem.ts
var QRTabItemElement = class _QRTabItemElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  /** Registers the tag once. */
  static define(tag = "qr-tab-item", registry = customElements) {
    if (!registry.get(tag)) {
      registry.define(tag, this);
    }
    return this;
  }
  static get observedAttributes() {
    return ["label"];
  }
  /** Mirrored `label` attribute (required; drives the parent tab button). */
  get label() {
    return this.getAttribute("label") ?? "";
  }
  set label(value) {
    if (value) {
      this.setAttribute("label", value);
    } else {
      this.removeAttribute("label");
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "label" && oldValue !== newValue) {
      if (!this.label) {
        console.warn(
          "Missing attribute `label` on <qr-tab-item> (Starlight's TabItem requires it)."
        );
      }
      this.dispatchEvent(new CustomEvent("qr-tab-label-change", { bubbles: true, composed: true }));
    }
  }
  connectedCallback() {
    if (!this.label) {
      console.warn("Missing attribute `label` on <qr-tab-item> (Starlight's TabItem requires it).");
    }
    this.render();
  }
  static get styles() {
    return (
      /* css */
      `
      :host {
        display: block;
      }
      :host([hidden]) {
        display: none;
      }
    `
    );
  }
  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.setHTMLUnsafe(
      /* html */
      `
        <style>${_QRTabItemElement.styles}</style>
        <div class="panel" part="panel">
          <slot></slot>
        </div>
      `
    );
  }
};
var root = typeof globalThis !== "undefined" ? globalThis : window;
try {
  root.QRTabItemElement = QRTabItemElement.define();
} catch (e) {
  if (!(root.DOMException && e instanceof DOMException && e.name === "NotSupportedError") && !(e instanceof ReferenceError)) {
    throw e;
  }
}

// docs/src/components/tabs/Tabs.ts
var QRTabsElement = class _QRTabsElement extends HTMLElement {
  /** Live registry of groups sharing a `sync-key`, for cross-group sync. */
  static #syncedTabs = /* @__PURE__ */ new Map();
  /** Page-level counter so ids stay unique when several groups coexist. */
  static #instanceCount = 0;
  #syncKey = null;
  #uid = "";
  #index = 0;
  #buttons = [];
  #items = [];
  /** Storage key prefix must match the restore logic. */
  #storageKeyPrefix = "qr-render-tabs__";
  /** Stable ref so the label-change listener can be removed in `disconnectedCallback`. */
  #onLabelChange = () => this.render();
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  /** Registers the tag once. */
  static define(tag = "qr-tabs", registry = customElements) {
    if (!registry.get(tag)) {
      registry.define(tag, this);
    }
    return this;
  }
  static get observedAttributes() {
    return ["sync-key"];
  }
  /** Live index of the active panel. */
  get activeIndex() {
    return this.#index;
  }
  /** Item count, safe to read before upgrade of the children. */
  get length() {
    return this.#collectItems().length;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "sync-key" && oldValue !== newValue && this.isConnected) {
      this.#unregister();
      this.#syncKey = newValue;
      this.#register();
    }
  }
  connectedCallback() {
    this.#uid = `qr-tabs-${++_QRTabsElement.#instanceCount}`;
    this.#syncKey = this.getAttribute("sync-key");
    this.render();
    this.addEventListener("qr-tab-label-change", this.#onLabelChange);
    this.#restoreSynced();
    this.#register();
  }
  disconnectedCallback() {
    this.removeEventListener("qr-tab-label-change", this.#onLabelChange);
    this.#unregister();
  }
  /**
   * Selects a tab by index (clamped) and syncs/persists by `label`.
   * @param {number} index
   * @param {{ propagate?: boolean }} [options] `false` skips sibling sync/persist.
   */
  select(index, { propagate = true } = {}) {
    const items = this.#collectItems();
    const next = Math.min(Math.max(index, 0), Math.max(items.length - 1, 0));
    const item = items[next];
    if (!item) return;
    this.#index = next;
    this.#buttons.forEach((button, i) => {
      const selected = i === next;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    items.forEach((el, i) => {
      el.role = "tabpanel";
      el.id = `${this.#uid}-panel-${i}`;
      el.setAttribute("aria-labelledby", `${this.#uid}-tab-${i}`);
      el.hidden = i !== next;
    });
    const label = item.label.trim();
    if (!propagate) return;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { index: next, label },
        bubbles: true,
        composed: true
      })
    );
    if (this.#syncKey) {
      for (const other of _QRTabsElement.#syncedTabs.get(this.#syncKey) ?? []) {
        if (other !== this) other.#selectByLabel(label, { propagate: false });
      }
      try {
        localStorage.setItem(this.#storageKeyPrefix + this.#syncKey, label);
      } catch {
      }
    }
  }
  /** Rebuilds the tablist (collects items, renders shadow, applies selection). */
  render() {
    this.#collectItems();
    if (!this.shadowRoot) return;
    const tabs = this.#items.map((item, i) => {
      const label = item.label.trim() || `Tab ${i + 1}`;
      return `
          <button
            role="tab"
            id="${this.#uid}-tab-${i}"
            aria-controls="${this.#uid}-panel-${i}"
            aria-selected="${i === 0}"
            tabindex="${i === 0 ? 0 : -1}"
          >
            ${label.replace(/</g, "&lt;")}
          </button>`;
    }).join("");
    this.shadowRoot.setHTMLUnsafe(
      /* html */
      `
        <style>${_QRTabsElement.styles}</style>
        <div class="tablist-wrapper" part="tablist-wrapper">
          <div role="tablist" part="tablist">${tabs}</div>
        </div>
        <slot></slot>
      `
    );
    this.#buttons = [...this.shadowRoot.querySelectorAll("button")];
    if (this.#buttons.length > 0) {
      this.#bindTablist();
      this.select(this.#index, { propagate: false });
    }
  }
  static get styles() {
    return (
      /* css */
      `
      :host {
        display: block;
        font-family: inherit;
      }
      .tablist-wrapper {
        overflow-x: auto;
        /* Respiro entre la l\xEDnea inferior del tablist y el panel (Starlight:
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
    );
  }
  #collectItems() {
    this.#items = [...this.querySelectorAll(":scope > qr-tab-item")];
    return this.#items;
  }
  #bindTablist() {
    const tablist = this.shadowRoot?.querySelector('[role="tablist"]');
    if (!tablist) return;
    tablist.addEventListener("click", (e) => {
      const target = e.target;
      const button = target.closest("button");
      if (button) this.select(this.#buttons.indexOf(button));
    });
    tablist.addEventListener("keydown", (ev) => {
      const e = ev;
      const count = this.#buttons.length;
      const key = e.key;
      const next = {
        ArrowRight: (this.#index + 1) % count,
        ArrowLeft: (this.#index - 1 + count) % count,
        Home: 0,
        End: count - 1
      }[key];
      if (next === void 0) return;
      e.preventDefault();
      this.select(next);
      this.#buttons[next].focus();
    });
  }
  /** Restores the persisted active tab for this `sync-key`, if any. */
  #restoreSynced() {
    if (!this.#syncKey || typeof localStorage === "undefined") return;
    let label = null;
    try {
      label = localStorage.getItem(this.#storageKeyPrefix + this.#syncKey);
    } catch {
      return;
    }
    if (!label) return;
    this.#selectByLabel(label, { propagate: false });
  }
  #selectByLabel(label, options) {
    const index = this.#collectItems().findIndex((item) => item.label.trim() === label);
    if (index > 0) this.select(index, options);
  }
  #register() {
    if (!this.#syncKey || !this.isConnected) return;
    const groups = _QRTabsElement.#syncedTabs.get(this.#syncKey) ?? [];
    groups.push(this);
    _QRTabsElement.#syncedTabs.set(this.#syncKey, groups);
  }
  #unregister() {
    if (!this.#syncKey) return;
    const groups = _QRTabsElement.#syncedTabs.get(this.#syncKey) ?? [];
    _QRTabsElement.#syncedTabs.set(
      this.#syncKey,
      groups.filter((group) => group !== this)
    );
  }
};
var root2 = typeof globalThis !== "undefined" ? globalThis : window;
try {
  root2.QRTabsElement = QRTabsElement.define();
} catch (e) {
  if (!(root2.DOMException && e instanceof DOMException && e.name === "NotSupportedError") && !(e instanceof ReferenceError)) {
    throw e;
  }
}
