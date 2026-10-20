# @qr-render/web

A lightweight library to generate QR codes in the browser with an HTML5 Canvas renderer, built on
top of [`@qr-render/core`](../core).

## Installation

```bash
npm install @qr-render/web
# or
pnpm add @qr-render/web
```

## Quick start (Browser)

Minimal example that mounts a QR code inside a container with id `qr`:

```html
<div id="qr"></div>
<script type="module">
	import QRCode from '@qr-render/web'

	// Create and render immediately (constructor accepts an element or id and options/text)
	const q = new QRCode('qr', { text: 'https://example.com', width: 300, height: 300 })

	// Update content
	q.makeCode('https://another-url.example')

	// Clear
	// q.clear()
</script>
```

The package also ships `dist/index.browser.js`, a self-contained IIFE build that exposes `QRCode` as
a global (it inlines `@qr-render/core`).

## Main API

| Symbol                    |                                                                                Type | Description                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------- |
| `new QRCode(el, vOption)` | `constructor(el: HTMLElement \| string, vOption: string \| Partial<QRCodeOptions>)` | Create a QRCode instance. `el` is a DOM element or element id. `vOption` can be a plain text string or an options object. |
| `makeCode(sText)`         |                                                     `makeCode(sText: string): void` | Generate a QR model from `sText` and draw it on the canvas.                                                               |
| `clear()`                 |                                                                     `clear(): void` | Clear the rendered canvas.                                                                                                |

## Options (`QRCodeOptions`)

| Option         | Type     |   Default | Description                                          |
| -------------- | -------- | --------: | ---------------------------------------------------- |
| `text`         | `string` |      `""` | Text to encode.                                      |
| `width`        | `number` |     `256` | Canvas width in pixels.                              |
| `height`       | `number` |     `256` | Canvas height in pixels.                             |
| `colorDark`    | `string` | `#000000` | Color used for dark modules.                         |
| `colorLight`   | `string` | `#ffffff` | Background/light module color.                       |
| `correctLevel` | `number` |       `2` | Error correction level from `QrErrorCorrectLevel`.   |
| `margin`       | `number` |      `10` | Physical pixel margin around the canvas.             |
| `quietZone`    | `number` |       `4` | Virtual modules added as quiet zone around the code. |
| `roundness`    | `number` |       `0` | Module corner roundness (0..1).                      |
| `pixelSize`    | `number` |       `1` | Scale factor for module size relative to tile.       |

## Exporting images

Since the renderer uses a DOM canvas, you can export images by calling
`HTMLCanvasElement.toDataURL()` on the canvas element inserted into the container.

## Development & tests

```bash
pnpm install
pnpm --filter @qr-render/web test
```

## License

MIT © [OctaEDLP00](https://github.com/OctaEDLP00). See `LICENSE` in this package.
