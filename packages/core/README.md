# @qr-render/core

The modern, zero-dependency successor to qrcodejs — as a **platform-agnostic engine**. Encodes text
into a fully masked, error-corrected QR matrix (ISO/IEC 18004) with no DOM, Node or terminal
dependencies, so it can power any renderer:

- [`@qr-render/web`](../web) — Canvas renderer for the browser
- [`@qr-render/cli`](../cli) — ANSI renderer for the terminal

This is the single source of truth for the generation logic shared by both packages. Previously this
logic was duplicated between the web and CLI repositories; now it lives here.

## Installation

```bash
npm install @qr-render/core
# or
pnpm add @qr-render/core
```

## Quick start

```ts
import { QRCodeModel, QrErrorCorrectLevel } from '@qr-render/core'

const model = new QRCodeModel(4, QrErrorCorrectLevel.M)
model.addData('https://example.com')
model.make()

// Consume the matrix from any renderer:
model.getModuleCount() // matrix size (N x N)
model.isDark(row, col)
```

## API

| Symbol                                       | Description                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `QRCodeModel(typeNumber, errorCorrectLevel)` | Builds the QR matrix. `addData(text)` + `make()`, then read with `isDark(row, col)` / `getModuleCount()` |
| `QRRSBlock`                                  | Reed-Solomon block structure (complete standard table, versions 1–40)                                    |
| `QRBitBuffer`                                | Bit-level writer used for the encoded segments                                                           |
| `QRMath`, `QRPolynomial`                     | Galois field math and polynomial arithmetic for error correction                                         |
| `QrErrorCorrectLevel`                        | `{ M: 0, L: 1, H: 2, Q: 3 }` — ISO format-information convention                                         |
| `QRCodeOptions`, `DrawingProvider`           | Shared option and renderer interfaces                                                                    |

## Capacity

The RS block table is complete for versions 1–40 (max ~2953 bytes at level L). Choose the smallest
`typeNumber` that fits your data, or iterate 1→40 like `@qr-render/cli` does.

## License

MIT © [OctaEDLP00](https://github.com/OctaEDLP00). Based on the classic implementations that were
MIT licensed by Kazuhiko Arase / davidshimjs.
