/**
 * Pixel-perfect Canvas renderer for QR codes.
 *
 * The #1 visual bug of naive Canvas QR renderers is seams: drawing each
 * module independently with a fractional tile size leaves hairline gaps
 * between tiles. This renderer guarantees seamless output thanks to two
 * strategies:
 *
 * 1. **Grid snapping** — `grid[i] = Math.round(margin + i * tileSize)`:
 *    every rect starts and ends on whole-pixel lines, so adjacent modules
 *    share that exact boundary (no anti-aliasing gap, no overdraw bleed).
 * 2. **One-shot finder patterns** — each finder block is painted with a
 *    single path (`drawFinderGrid`: 7×7 + 5×5 + 3×3), not by iterating its
 *    49 modules, so rounding differences inside the block are impossible.
 *
 * For decorative styles (`roundness > 0` or `pixelSize < 1`) there is a
 * "stylized" mode that trades snapping for rounded shapes with
 * anti-aliasing, inflating tiles by half a pixel to compensate hairlines.
 */
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
	 * Creates a canvas of `options.width × height`, clears the container and
	 * mounts the canvas inside it.
	 * @param el Container the canvas is appended to.
	 * @param options Validated options of the generator.
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

		// Clear the container and append the canvas
		this._el.innerHTML = ''
		this._el.appendChild(this._canvas)
	}

	/**
	 * Draws the QR model on the canvas.
	 *
	 * Walks the matrix module by module and picks between two strategies:
	 *
	 * - Strict mode (default): whole-pixel snapped grid — seamless, no
	 *   anti-aliasing.
	 * - Stylized mode (`roundness > 0` or `pixelSize < 1`): floating rounded
	 *   tiles with half-pixel anti-seam bleed.
	 *
	 * @param model Already-generated model (`make()` applied): provides the
	 *   matrix via {@link QRCodeModel.isDark} and
	 *   {@link QRCodeModel.getModuleCount}.
	 */
	draw(model: QRCodeModel): void {
		const context = this._canvas.getContext('2d')
		if (!context) return

		const { width, height, colorDark, colorLight, margin, quietZone, roundness, pixelSize } =
			this._options
		const rawCount = model.getModuleCount()

		// QuietZone adds virtual modules, Margin adds direct physical pixels
		const totalModuleCount = rawCount + quietZone * 2
		const availableSize = Math.min(width, height) - margin * 2
		const tileSize = availableSize / totalModuleCount

		// Background
		context.fillStyle = colorLight
		context.fillRect(0, 0, width, height)

		// Whole grid: every tile boundary snaps to a whole pixel. Adjacent
		// modules share the exact boundary (fillRect at integer coordinates
		// produces no anti-aliasing), so a light seam can never appear between
		// dark modules. In exchange, some tiles may measure ±1 px against the
		// fractional grid: scanners do not notice it.
		const grid: number[] = new Array(totalModuleCount + 1)
		for (let i = 0; i <= totalModuleCount; i++) {
			grid[i] = Math.round(margin + i * tileSize)
		}

		// Stylized mode (roundness > 0 or tile < 1): AA re-render, where the
		// separation between modules is part of the design and the half-pixel
		// bleed keeps full-size pieces joined.
		const stylized = roundness !== 0 || pixelSize < 1

		context.fillStyle = colorDark

		for (let row = 0; row < rawCount; row++) {
			for (let col = 0; col < rawCount; col++) {
				if (!model.isDark(row, col)) continue

				// Position probes (7x7 corner marks)
				const isFinder =
					(row < 7 && col < 7) ||
					(row < 7 && col >= rawCount - 7) ||
					(row >= rawCount - 7 && col < 7)

				const gx = col + quietZone
				const gy = row + quietZone

				if (!stylized) {
					if (isFinder) {
						// The frame is drawn exactly ONCE per block: only at the
						// top-left cell of each mark (as drawFinderFloat does).
						// Drawing the full block on each of the 49 calls would
						// union 49 shifted rects (13x13 blobs).
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
					// Data points (Dots)
					const size = tileSize * pixelSize
					const offset = (tileSize - size) / 2
					const r = (size / 2) * roundness

					// Anti-seams in stylized mode: inflating the tile by half a
					// pixel removes the sub-pixel hairline between pieces
					// (pixelSize < 1 leaves a gap on purpose).
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
	 * Pixel-perfect finder: outer frame with hole + solid center, all with
	 * rects at integer coordinates against the grid (no AA, no seams with
	 * neighboring modules).
	 *
	 * The frame is traced as a pair of paths with `fill('evenodd')` (7×7
	 * outer minus 5×5 inner) and the 3×3 center as a solid `fillRect`.
	 *
	 * @param ctx 2D context of the canvas.
	 * @param grid Snapped boundary grid (see {@link draw}).
	 * @param gx Grid column where the 7×7 block starts (quietZone already applied).
	 * @param gy Grid row where the 7×7 block starts (quietZone already applied).
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

		// Solid centers (3x3)
		ctx.fillRect(grid[gx] + offX(2), grid[gy] + offY(2), offX(5) - offX(2), offY(5) - offY(2))
	}

	/**
	 * Stylized finder: frames as single rounded pieces.
	 *
	 * Unlike {@link drawFinderGrid}, the finder here is composed of two
	 * `roundRect` pieces (7×7 frame with hole, 3×3 center) using the
	 * proportional rounding of `roundness`. The drawing only fires at the
	 * block's local `(0, 0)` cell — the frame hole is subtracted with a
	 * negative-dimension `rect` inside the same path.
	 *
	 * @param ctx 2D context of the canvas.
	 * @param x Floating X coordinate of the block origin, in pixels.
	 * @param y Floating Y coordinate of the block origin, in pixels.
	 * @param s Floating tile size, in pixels.
	 * @param r Absolute row of the current module in the QR matrix.
	 * @param c Absolute column of the current module in the QR matrix.
	 * @param count Total module count of the QR matrix.
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

		// Relative position inside the 7x7 block
		const localR = r < 7 ? r : r >= count - 7 ? r - (count - 7) : -1
		const localC = c < 7 ? c : c >= count - 7 ? c - (count - 7) : -1

		// 1. Outer frame (the drawing only fires at the finder's 0,0 cell)
		if (localR === 0 && localC === 0) {
			const outerSize = s * 7
			const outerRadius = outerSize * 0.2 * roundness // Rounding proportional to the block

			ctx.beginPath()
			// Draw the outer square
			ctx.roundRect(x, y, outerSize, outerSize, outerRadius)
			// Draw the inner hole (reversed direction to "subtract" from the path)
			ctx.rect(x + s * 6, y + s, -s * 5, s * 5)
			ctx.fill()

			// 2. The solid center (3x3)
			// Drawn as a single rounded piece to avoid the "pixelated" look
			const innerSize = s * 3
			const innerRadius = (innerSize / 2) * roundness
			ctx.beginPath()
			ctx.roundRect(x + s * 2, y + s * 2, innerSize, innerSize, innerRadius)
			ctx.fill()
		}
	}

	/**
	 * Clears the canvas completely (leaves it transparent).
	 */
	clear(): void {
		this._canvas.getContext('2d')?.clearRect(0, 0, this._canvas.width, this._canvas.height)
	}
}
