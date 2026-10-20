/**
 * Global side-effect registrations performed by `docs/src/components/*`.
 * Mirrors the `global.d.ts` convention of the MyWebComponents repo.
 */
import type { QRTabItemElement } from './tabs/TabItem.js'
import type { QRTabsElement } from './tabs/Tabs.js'

declare global {
	interface Window {
		QRTabsElement: typeof QRTabsElement
		QRTabItemElement: typeof QRTabItemElement
	}
}

export {}
