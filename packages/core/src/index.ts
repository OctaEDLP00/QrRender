/**
 * @qr-render/core — agnostic QR engine.
 *
 * Generates the QR matrix (versions 1–40) with masking and Reed–Solomon
 * error correction, following ISO/IEC 18004. It is the shared arithmetic
 * brain of the suite and completely framework-agnostic: the I/O
 * (Canvas, terminal, SVG……) lives in the packages that consume it.
 *
 * Entry points:
 * - {@link QRCodeModel}: the QR codes themselves (addData → make → isDark).
 * - {@link QRBitBuffer} / {@link QRRSBlock} / {@link QRMath} / {@link QRPolynomial}: Reed–Solomon pieces.
 * - `types`: {@link QRCodeOptions} and {@link QrErrorCorrectLevel} (ISO convention).
 */

/**
 * @qr-render/core — Bun/Node/neutral ESM engine.
 * Zero dependencies; see the package README for arithmetic details.
 */
export { QRBitBuffer } from './core/QRBitBuffer.js'
export { QRCodeModel } from './core/QRCodeModel.js'
export { QRRSBlock } from './core/QRRSBlock.js'
export { QRMath } from './libs/QRMath.js'
export { QRPolynomial } from './libs/QRPolynomial.js'
export * from './types/index.js'
