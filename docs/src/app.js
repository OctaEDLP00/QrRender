/* ===== @qr-render docs · vanilla js ===== */
/* Importa el paquete real desde su fuente TS: en dev Vite transpila al vuelo
   (HMR incluido) y en el build rolldown lo bundlea como módulo ESM. */
import QRCode from '../../packages/web/src/index.ts'

;(() => {
	'use strict'

	const status = document.getElementById('status')

	const container = document.getElementById('qr-container')

	/** Estado compartido. Cada opción visual se aplica en el constructor del renderer. */
	const state = {
		text: 'https://github.com/OctaEDLP00/QrRender',
		width: 256,
		height: 256,
		colorDark: '#111827',
		colorLight: '#f8fafc',
		correctLevel: 0, // QrErrorCorrectLevel.M (~15%) — coincide con <option value="0" selected>
		margin: 10,
		quietZone: 4,
		roundness: 0,
		pixelSize: 1,
	}

	/** Pestaña activa del playground: 'text' (Texto / URL) o 'wifi' (WiFi). */
	let mode = 'text'

	/** Datos de la pestaña WiFi. */
	const wifi = { ssid: 'MiRed', security: 'WPA', password: '' }

	/**
	 * Escapa los caracteres reservados del formato WiFi (`\` `;` `,` `:`
	 * `"`) con una barra invertida, como define el estándar de los QR de
	 * credenciales WiFi (convención ZXing / Android / iOS).
	 */
	const escapeWifi = (value) => value.replace(/([\\;,:"])/g, '\\$1')

	/**
	 * String de credenciales WiFi: cada campo `K:valor` termina en `;` y el
	 * string completo cierra con `;;` — p. ej. WIFI:T:WPA;S:MiRed;P:clave;;
	 * Con `nopass` (red abierta) se omite el campo P.
	 * @returns {string}
	 */
	const wifiString = () => {
		const fields = [`T:${wifi.security}`, `S:${escapeWifi(wifi.ssid)}`]
		if (wifi.security !== 'nopass' && wifi.password) {
			fields.push(`P:${escapeWifi(wifi.password)}`)
		}
		return 'WIFI:' + fields.map((f) => f + ';').join('') + ';'
	}

	/** El contenido del QR depende de la pestaña activa. */
	const qrContent = () => (mode === 'wifi' ? wifiString() : state.text)

	/** @type {{ makeCode(text: string): void, clear(): void }} */
	let qrInstance

	/** (Re)instancia la librería con el estado actual y el contenido de la pestaña activa. */
	const init = () => {
		try {
			qrInstance = new QRCode(container, { ...state, text: qrContent() })
			status.textContent = ''
			return true
		} catch (error) {
			status.textContent = `⚠ Error al generar el QR: ${error.message}`
			status.style.color = '#ff7b72'
			return false
		}
	}

	/**
	 * Regenera el QR con el contenido de la pestaña activa (makeCode sin
	 * re-instanciar: solo cambia el texto codificado).
	 */
	const syncQr = () => {
		try {
			qrInstance.makeCode(qrContent())
			status.textContent = '✓ Actualizado'
		} catch (error) {
			status.textContent = `⚠ Error al generar el QR: ${error.message}`
			status.style.color = '#ff7b72'
		}
	}

	init()

	/**
	 * Enlaza un input con el estado.
	 * Solo `text` se re-renderiza con makeCode(): las opciones visuales y el
	 * correctLevel viven en el constructor, así que requieren re-instanciar.
	 *
	 * IMPORTANTE: `parse` (para el estado) y `format` (solo etiqueta) están
	 * separados: aquí estaba el bug del margen — el formatter devolvía '12px'
	 * y contaminaba el estado con un string → NaN en el renderer.
	 */
	const bind = (id, key, parse = null, format = null) => {
		const input = document.getElementById(id)
		const out = document.getElementById(id + '-out')

		input.addEventListener('input', () => {
			if (out) {
				out.textContent = format ? format(input.value) : input.value
			}

			if (key === 'text') {
				state.text = input.value
				syncQr()
				return
			}
			if (key !== null) {
				state[key] = parse ? parse(input.value) : input.value
			}
			if (init()) {
				status.textContent = '✓ Actualizado'
			}
		})
	}

	bind('qr-text', 'text')
	bind('qr-level', 'correctLevel', v => parseInt(v, 10))
	bind('qr-color-dark', 'colorDark')
	bind('qr-color-light', 'colorLight')
	bind('qr-roundness', 'roundness', parseFloat)
	bind('qr-margin', 'margin', v => parseInt(v, 10), v => `${Math.round(v)}px`)
	bind('qr-quiet-zone', 'quietZone', parseInt)
	bind('qr-pixel-size', 'pixelSize', parseFloat)

	/**
	 * Pestaña WiFi: SSID + seguridad + contraseña. Con `nopass` (red
	 * abierta) se oculta el campo de contraseña y se omite `P:` en el string.
	 * El string compuesto se muestra siempre en <code id="qr-wifi-string">.
	 */
	const wifiSsid = document.getElementById('qr-wifi-ssid')
	const wifiSecurity = document.getElementById('qr-wifi-security')
	const wifiPassword = document.getElementById('qr-wifi-password')
	const wifiStringOut = document.getElementById('qr-wifi-string')
	const wifiPasswordLabel = document.getElementById('qr-wifi-password-label')

	const renderWifiUi = () => {
		if (wifiStringOut) wifiStringOut.textContent = wifiString()
		if (wifiPasswordLabel) wifiPasswordLabel.hidden = wifi.security === 'nopass'
	}

	wifiSsid?.addEventListener('input', () => {
		wifi.ssid = wifiSsid.value
		renderWifiUi()
		if (mode === 'wifi') syncQr()
	})
	wifiSecurity?.addEventListener('input', () => {
		wifi.security = wifiSecurity.value
		renderWifiUi()
		if (mode === 'wifi') syncQr()
	})
	wifiPassword?.addEventListener('input', () => {
		wifi.password = wifiPassword.value
		renderWifiUi()
		if (mode === 'wifi') syncQr()
	})

	/**
	 * Botón de previsualización de la contraseña: alterna type entre
	 * password/text con estado accesible (aria-pressed) e icono reflejo.
	 */
	const wifiPasswordToggle = document.getElementById('qr-wifi-password-toggle')
	wifiPasswordToggle?.addEventListener('click', () => {
		const show = wifiPassword.type === 'password'
		wifiPassword.type = show ? 'text' : 'password'
		wifiPasswordToggle.setAttribute('aria-pressed', String(show))
		wifiPasswordToggle.title = show ? 'Ocultar contraseña' : 'Mostrar contraseña'
		wifiPasswordToggle.setAttribute('aria-label', wifiPasswordToggle.title)
		wifiPasswordToggle.textContent = show ? '🙈' : '👁'
	})
	renderWifiUi()

	/**
	 * Cambio de pestaña del playground: alterna el contenido del QR entre el
	 * texto/URL y las credenciales WiFi compuestas.
	 * Sin `sync-key` a propósito: la primera pestaña al cargar mantiene el
	 * estado inicial `mode = 'text'` consistente.
	 */
	const playgroundTabs = document.querySelector('#playground qr-tabs')
	playgroundTabs?.addEventListener('change', (event) => {
		mode = event.detail?.index === 1 ? 'wifi' : 'text'
		syncQr()
	})

	/**
	 * width/height van juntos en un único slider: los outputs de un input
	 * con id "x" + "-out" no sirven aquí, así que se gestiona aparte.
	 */
	const sizeInput = document.getElementById('qr-size')
	const sizeOut = document.getElementById('qr-size-out')
	sizeInput.addEventListener('input', () => {
		state.width = state.height = parseInt(sizeInput.value, 10)
		sizeOut.textContent = `${state.width}px`
		if (init()) {
			status.textContent = '✓ Actualizado'
		}
	})

	// --- Acciones ---
	document.getElementById('btn-download').addEventListener('click', () => {
		const canvas = container.querySelector('canvas')
		if (!canvas) return
		const link = document.createElement('a')
		link.download = 'qr-render.png'
		link.href = canvas.toDataURL('image/png')
		link.click()
		status.textContent = '✓ PNG descargado'
	})

	/**
	 * Construye un SVG standalone del QR actual con la MISMA geometría del
	 * renderer Canvas: malla snapeada a píxel entero (grid[i] = round(margin
	 * + i * tileSize)), finders como marco 7x7 con hueco 5x5 (fill-rule
	 * evenodd) + centro sólido 3x3, y módulos de datos como <rect> enteros que
	 * comparten bordes (sin costuras ni antialiasing).
	 * @param {{ model: object | null }} qr Instancia de @qr-render/web
	 * @returns {string | null} Documento SVG; null si el modelo no existe aún.
	 */
	const buildSvg = (qr) => {
		const model = qr.model
		if (!model) return null

		const { width, height, colorDark, colorLight, margin, quietZone } = state
		const n = model.getModuleCount()
		const total = n + quietZone * 2
		const t = (Math.min(width, height) - margin * 2) / total
		const g = (i) => Math.round(margin + i * t)
		// colorDark/colorLight vienen de <input type="color"> (hex acotado), pero
		// se escapan igualmente para que el SVG sea siempre XML válido.
		const esc = (c) =>
			String(c).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch])

		const doc = [
			`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
			`<rect width="${width}" height="${height}" fill="${esc(colorLight)}"/>`,
		]

		for (let row = 0; row < n; row++) {
			for (let col = 0; col < n; col++) {
				if (!model.isDark(row, col)) continue

				const isFinder =
					(row < 7 && col < 7) || (row < 7 && col >= n - 7) || (row >= n - 7 && col < 7)
				const gx = col + quietZone
				const gy = row + quietZone

				if (isFinder) {
					const localR = row < 7 ? row : row - (n - 7)
					const localC = col < 7 ? col : col - (n - 7)
					if (localR !== 0 || localC !== 0) continue

					const fill = esc(colorDark)
					// Marco exterior 7x7 con hueco 5x5 (evenodd) y centro 3x3
					doc.push(
						`<path fill="${fill}" fill-rule="evenodd" d="M${g(gx)} ${g(gy)}H${g(gx + 7)}V${
							g(gy + 7)
						}H${g(gx)}Z M${g(gx + 1)} ${g(gy + 1)}H${g(gx + 6)}V${g(gy + 6)}H${g(gx + 1)}Z"/>`,
					)
					doc.push(
						`<rect x="${g(gx + 2)}" y="${g(gy + 2)}" width="${g(gx + 5) - g(gx + 2)}" height="${
							g(gy + 5) - g(gy + 2)
						}" fill="${fill}"/>`,
					)
				} else {
					doc.push(
						`<rect x="${g(gx)}" y="${g(gy)}" width="${g(gx + 1) - g(gx)}" height="${
							g(gy + 1) - g(gy)
						}" fill="${esc(colorDark)}"/>`,
					)
				}
			}
		}

		doc.push('</svg>')
		return doc.join('')
	}

	// Expuesto para inspección/verificación externa (probes de validación).
	window.__qrSvgString = () => buildSvg(qrInstance)

	document.getElementById('btn-download-svg').addEventListener('click', () => {
		const svg = buildSvg(qrInstance)
		if (!svg) return
		const link = document.createElement('a')
		link.download = 'qr-render.svg'
		link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
		link.click()
		status.textContent = '✓ SVG descargado'
	})

	document.getElementById('btn-clear').addEventListener('click', () => {
		qrInstance.clear()
		status.textContent = '✓ Canvas limpio'
	})
})()
