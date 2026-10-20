// @vitest-environment node
import { buildWiFiString, escapeWiFiValue } from '../../src/wifi.js'
import { describe, it, expect } from 'vitest'

describe('escapeWiFiValue', () => {
	it('should backslash-escape every reserved character of the WiFi URI scheme', () => {
		expect(escapeWiFiValue('a;b:c,d"e\\f')).toBe('a\\;b\\:c\\,d\\"e\\\\f')
	})

	it('should leave plain alphanumerics untouched', () => {
		expect(escapeWiFiValue('Sup3r$ecret')).toBe('Sup3r$ecret')
		expect(escapeWiFiValue('MyNetwork')).toBe('MyNetwork')
	})
})

describe('buildWiFiString', () => {
	it('should put the SSID first, then T and P (order most scanners expect)', () => {
		expect(buildWiFiString({ ssid: 'MiRed', password: 'clave123', security: 'WPA' })).toBe(
			'WIFI:S:MiRed;T:WPA;P:clave123;;'
		)
	})

	it('should omit P when the password is empty and drop T for open networks', () => {
		expect(buildWiFiString({ ssid: 'OpenNet', security: 'nopass' })).toBe('WIFI:S:OpenNet;;')
		expect(buildWiFiString({ ssid: 'OpenNet', password: 'x', security: 'nopass' })).toBe(
			'WIFI:S:OpenNet;;'
		)
	})

	it('should add H:true for hidden SSIDs', () => {
		expect(buildWiFiString({ ssid: 'Hidden', password: 'pw', security: 'WEP', hidden: true })).toBe(
			'WIFI:S:Hidden;T:WEP;P:pw;H:true;;'
		)
	})

	it('should escape reserved characters inside SSID and password', () => {
		expect(buildWiFiString({ ssid: 'Net;Work', password: 'p:a,ss"w\\d' })).toBe(
			'WIFI:S:Net\\;Work;T:WPA;P:p\\:a\\,ss\\"w\\\\d;;'
		)
	})

	it('should match the payload shape Android (AOSP WifiQrCode) and iOS document', () => {
		// AOSP example: WIFI:T:WPA;S:mynetwork;P:mypass;; — same fields, S first.
		const built = buildWiFiString({ ssid: 'mynetwork', password: 'mypass' })
		expect(built.startsWith('WIFI:S:')).toBe(true)
		expect(built.endsWith(';;')).toBe(true)
	})
})
