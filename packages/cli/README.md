# @qr-render/cli

A professional, high-performance QR Code generation tool for the terminal. Generate QR codes
directly in your CLI, render them with ANSI colors **or export them as PNG/SVG files** — powered by
[`@qr-render/core`](../core).

Command: `qr`

## Installation

### Using npm

```bash
npm install -g @qr-render/cli
```

### Using pnpm

```bash
pnpm add -g @qr-render/cli
```

## Quick Start

```bash
qr "https://example.com"
```

This will display a QR code in your terminal that you can scan with any QR code reader.

## Usage

```bash
qr <text> [options]
```

| Argument | Description                              | Required |
| -------- | ---------------------------------------- | -------- |
| `<text>` | The text or URL to encode in the QR code | Yes      |

### Options

| Flag                  | Description                                                                             | Default    |
| --------------------- | --------------------------------------------------------------------------------------- | ---------- |
| `-s, --size <number>` | Scale factor for the QR code modules (px per module in exported files)                  | `1`        |
| `-q, --quiet-zone`    | Quiet zone (padding) in modules                                                         | `4`        |
| `-l, --level <type>`  | Error correction level (`L`, `M`, `Q`, `H`)                                             | `M`        |
| `--dark <color>`      | ANSI escape (foreground) for dark modules (hex `#rgb`/`#rrggbb` when using `--output`)  | `\x1b[30m` |
| `--light <color>`     | ANSI escape (foreground) for light modules (hex `#rgb`/`#rrggbb` when using `--output`) | `\x1b[97m` |
| `-o, --output <path>` | Save the QR code to a file instead of the terminal                                      | –          |

### `--output`: export to PNG / SVG

Pass `-o`/`--output` and the CLI skips the terminal rendering and writes the QR code to disk:

- **Format autodetection** from the file extension: `.png` (default when no extension) and `.svg`.
- **Zero dependencies**: PNG is encoded with a built-in RGB encoder (+ `node:zlib`); SVG is
  generated as a crisp vector of rects.
- `--dark` / `--light` accept hex colors (`#000`, `#102030`) for file output.
- Success feedback prints the absolute saved path, and missing directories are created
  automatically.

```bash
# Detected as PNG (e.g. share a WiFi key in one scan)
qr "WIFI:S:MyNetwork;P:password;;" --output ./my-wifi.png -s 6

# Vector output, scales perfectly for print
qr "https://example.com/pay" --output ./pay-qr.svg -s 10 -l H

# No extension => defaults to .png
qr "Payment Code: ABC123XYZ" --output ./out/receipt -s 8 -q 6
```

More terminal examples:

```bash
qr "Payment Code: ABC123XYZ" --size 3 --level H --quiet-zone 5
qr "QR" --size 1 --quiet-zone 2 --level L
qr "Custom" --dark "\x1b[44m  \x1b[0m" --light "\x1b[42m  \x1b[0m"
```

## How It Works

1. **Input Parsing** – The CLI parses your input text and options
2. **Optimal Version Selection** – Automatically determines the minimum QR code version (1–40)
   needed to encode your data without overflow
3. **QR Code Generation** – `@qr-render/core` creates the QR matrix
4. **Rendering** – `ConsoleDrawing` renders the matrix using full-block glyphs (`██`) with
   foreground ANSI colors (seamless — no background-color borders between modules), or the file
   encoders (`image/png.ts`, `image/svg.ts`) export the `--output` file

> Level correction values are handled by the shared core (`M=0, L=1, H=2, Q=3`, ISO convention),
> which fixes the shifted-level mapping that the old standalone CLI package had.

## Development

```bash
pnpm install
pnpm --filter @qr-render/cli test
pnpm --filter @qr-render/cli build   # bundle to dist/cli.js
node packages/cli/dist/cli.js "Hi"
```

### Roadmap

- Custom terminal QR viewer (ink-picture / terminal-image based component idea)

## License

MIT © [OctaEDLP00](https://github.com/OctaEDLP00)
