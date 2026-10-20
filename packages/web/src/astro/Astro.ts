import { Component, QrCodeProps } from './types.js'
// @ts-ignore
import { default as QRCodeComponent } from './QrCode.astro'

export const QrCode = QRCodeComponent as Component<QrCodeProps>
export default QrCode
export type { Component, QrCodeProps } from './types.js'
