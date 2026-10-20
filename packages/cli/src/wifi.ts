/**
 * WiFi credentials string builder (ZXing "Wi-Fi Network config" convention,
 * adopted by Android 10+ and iOS 11+).
 *
 * @example
 * 	buildWiFiString({ ssid: 'UNO57TOLOSA', password: 'Edlp050524$' })
 * 	// → 'WIFI:S:UNO57TOLOSA;T:WPA;P:Edlp050524$;;'
 */

/**
 * Accepted security types for the `T` field.
 * - `WPA` covers WPA/WPA2 and WPA3 PSK networks (the OS negotiates).
 * - `WEP` for legacy networks.
 * - `nopass` for open networks (without `P` field).
 */
export type WiFiSecurity = 'WPA' | 'WEP' | 'nopass'

/**
 * Credentials for a WiFi QR code payload.
 */
export interface WiFiCredentials {
	/**
	 * Network SSID. Required and case-sensitive.
	 */
	ssid: string
	/**
	 * Pre-shared key. Ignored for open networks; may be omitted.
	 * @default ''
	 */
	password?: string
	/**
	 * Security type. @default 'WPA'
	 */
	security?: WiFiSecurity
	/**
	 * Whether the SSID is hidden (non-broadcast).
	 * @default false
	 */
	hidden?: boolean
}

/**
 * Reserved characters of the WiFi URI scheme. The ZXing spec requires
 * escaping them with a backslash inside values: `\` `;` `,` `:`.
 * A literal `"` breaks parsers that quote-wrap SSIDs, so it is escaped too.
 */
const RESERVED = /([\\;,:"])/g

/**
 * Backslash-escapes a field value of the WiFi string.
 * @param {string} value - Raw value typed by the user (SSID or password).
 * @returns {string} Escaped value, safe to embed between delimiters.
 */
export const escapeWiFiValue = (value: string): string => value.replace(RESERVED, '\\$1')

/**
 * Builds the `WIFI:` string with the SSID first (S:T:P;H), the field order
 * most scanners expect. Ends with the `;;` terminator the convention requires.
 * @param {WiFiCredentials} credentials - SSID, password, security type and hidden flag.
 * @returns {string} Payload ready to encode in a QR model.
 */
export const buildWiFiString = ({
	ssid,
	password = '',
	security = 'WPA',
	hidden = false,
}: Required<WiFiCredentials>): string => {
	const fields = [`S:${escapeWiFiValue(ssid)}`]
	if (security !== 'nopass') {
		fields.push(`T:${security}`)
		if (password) fields.push(`P:${escapeWiFiValue(password)}`)
	}
	if (hidden) fields.push('H:true')
	return `WIFI:${fields.join(';')};;`
}
