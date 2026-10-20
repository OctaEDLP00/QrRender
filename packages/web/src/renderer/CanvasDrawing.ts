import { QRCodeModel } from '@qr-render/core'
import { DrawingProvider, QRCodeOptions } from '@qr-render/core'

/**
 * HTML5 Canvas-based renderer.
 * @implements DrawingProvider
 */
export class CanvasDrawing implements DrawingProvider {
	private _el: HTMLElement
	private _canvas: HTMLCanvasElement
	private _options: Required<QRCodeOptions>

	/**
	 *
	 * @param el
	 * @param options
	 */
	constructor(el: HTMLElement, options: Required<QRCodeOptions>) {
		this._el = el
		this._options = {
			// @ts-ignore
			margin: 0,
			// @ts-ignore
			roundness: 0,
			// @ts-ignore
			pixelSize: 1,
			// @ts-ignore
			...options,
		}
		this._canvas = document.createElement('canvas')
		this._canvas.width = options.width
		this._canvas.height = options.height

		// Limpiamos el contenedor y añadimos el canvas
		this._el.innerHTML = ''
		this._el.appendChild(this._canvas)
	}

	/**
	 * Draw the QR code model on the canvas.
	 * @param model
	 * @returns void
	 */
	draw(model: QRCodeModel): void {
		const context = this._canvas.getContext('2d')
		if (!context) return

		const { width, height, colorDark, colorLight, margin, quietZone, roundness, pixelSize } =
			this._options
		const rawCount = model.getModuleCount()

		// QuietZone añade módulos virtuales, Margin añade píxeles físicos directos
		const totalModuleCount = rawCount + quietZone * 2
		const availableSize = Math.min(width, height) - margin * 2
		const tileSize = availableSize / totalModuleCount

		// Fondo
		context.fillStyle = colorLight
		context.fillRect(0, 0, width, height)

		// Malla entera: cada límite de tile se esnapea a píxel entero. Los módulos
		// adyacentes comparten el borde exacto (fillRect en coordenadas enteras
		// no genera antialiasing), de modo que entre dark modules nunca puede
		// quedar una costura clara. A cambio, algún tile puede medir ±1 px
		// respecto a la malla fraccional: es imperceptible para los escáneres.
		const grid: number[] = new Array(totalModuleCount + 1)
		for (let i = 0; i <= totalModuleCount; i++) {
			grid[i] = Math.round(margin + i * tileSize)
		}

		// Modo estilizado (roundness > 0 o tile < 1): re-render con AA, donde la
		// separación entre módulos es parte del diseño y el bleed medio-píxel
		// mantiene unidas las piezas a tamaño completo.
		const stylized = roundness !== 0 || pixelSize < 1

		context.fillStyle = colorDark

		for (let row = 0; row < rawCount; row++) {
			for (let col = 0; col < rawCount; col++) {
				if (!model.isDark(row, col)) continue

				// Position probes (marcas 7x7 de las esquinas)
				const isFinder =
					(row < 7 && col < 7) ||
					(row < 7 && col >= rawCount - 7) ||
					(row >= rawCount - 7 && col < 7)

				const gx = col + quietZone
				const gy = row + quietZone

				if (!stylized) {
					if (isFinder) {
						// El marco se dibuja UNA sola vez por bloque: únicamente en
						// la celda superior-izquierda de cada marca (como hace
						// drawFinderFloat). Dibujar el bloque completo en cada una
						// de las 49 llamadas produciría la unión de 49 rects
						// desplazados (blobs de 13x13).
						const localR = row < 7 ? row : row - (rawCount - 7)
						const localC = col < 7 ? col : col - (rawCount - 7)
						if (localR === 0 && localC === 0) {
							this.drawFinderGrid(context, grid, gx, gy)
						}
					} else {
						context.fillRect(grid[gx], grid[gy], grid[gx + 1] - grid[gx], grid[gy + 1] - grid[gy])
					}
					continue
				}

				const x = margin + gx * tileSize
				const y = margin + gy * tileSize

				if (isFinder) {
					this.drawFinderFloat(context, x, y, tileSize, row, col, rawCount)
				} else {
					// Puntos de datos (Dots)
					const size = tileSize * pixelSize
					const offset = (tileSize - size) / 2
					const r = (size / 2) * roundness

					// Anti-seams en modo estilizado: inflar el tile medio píxel
					// elimina el hairline sub-pixel entre piezas (pixelSize < 1 deja
					// hueco a propósito).
					const bleed = pixelSize >= 1 ? 0.5 : 0

					context.beginPath()
					context.roundRect(
						x + offset - bleed,
						y + offset - bleed,
						size + bleed * 2,
						size + bleed * 2,
						r
					)
					context.fill()
				}
			}
		}
	}

	/**
	 * Finder pixel-perfect: marco exterior con hueco + centro sólido, todo con
	 * rects de coordenadas enteras contra la malla (sin AA, sin costuras con
	 * los módulos vecinos).
	 */
	private drawFinderGrid(
		ctx: CanvasRenderingContext2D,
		grid: number[],
		gx: number,
		gy: number
	): void {
		const offX = (i: number) => grid[gx + i] - grid[gx]
		const offY = (i: number) => grid[gy + i] - grid[gy]

		ctx.beginPath()
		ctx.rect(grid[gx], grid[gy], offX(7), offY(7))
		ctx.rect(grid[gx] + offX(1), grid[gy] + offY(1), offX(6) - offX(1), offY(6) - offY(1))
		ctx.fill('evenodd')

		// Centros sólidos (3x3)
		ctx.fillRect(grid[gx] + offX(2), grid[gy] + offY(2), offX(5) - offX(2), offY(5) - offY(2))
	}

	/**
	 * Finder estilizado: los marcos como piezas únicas redondeadas
	 */
	private drawFinderFloat(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		s: number,
		r: number,
		c: number,
		count: number
	): void {
		const { roundness } = this._options

		// Obtenemos la posición relativa dentro del bloque 7x7
		const localR = r < 7 ? r : r >= count - 7 ? r - (count - 7) : -1
		const localC = c < 7 ? c : c >= count - 7 ? c - (count - 7) : -1

		// 1. Marco Exterior (Solo disparamos el dibujo en la celda 0,0 del localizador)
		if (localR === 0 && localC === 0) {
			const outerSize = s * 7
			const outerRadius = outerSize * 0.2 * roundness // Redondeo proporcional al bloque

			ctx.beginPath()
			// Dibujamos el cuadrado exterior
			ctx.roundRect(x, y, outerSize, outerSize, outerRadius)
			// Dibujamos el hueco interior (sentido contrario para "restar" del path)
			ctx.rect(x + s * 6, y + s, -s * 5, s * 5)
			ctx.fill()

			// 2. El Centro Sólido (3x3)
			// Lo dibujamos como una sola pieza redondeada para evitar el efecto "píxel"
			const innerSize = s * 3
			const innerRadius = (innerSize / 2) * roundness
			ctx.beginPath()
			ctx.roundRect(x + s * 2, y + s * 2, innerSize, innerSize, innerRadius)
			ctx.fill()
		}
	}

	/**
	 *
	 * @returns void
	 */
	clear(): void {
		this._canvas.getContext('2d')?.clearRect(0, 0, this._canvas.width, this._canvas.height)
	}
}
