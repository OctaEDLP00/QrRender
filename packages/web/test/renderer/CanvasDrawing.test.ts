import { CanvasDrawing } from '../../src/renderer/CanvasDrawing.js'
import { QRCodeModel, QrErrorCorrectLevel } from '@qr-render/core'
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('CanvasDrawing', () => {
	let container: HTMLElement
	const options = {
		width: 200,
		height: 200,
		colorDark: '#000000',
		colorLight: '#ffffff',
		quietZone: 4,
		margin: 10,
		roundness: 0.5,
		pixelSize: 1,
	}

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	it('should create a canvas element inside the container', () => {
		new CanvasDrawing(container, options as any)
		const canvas = container.querySelector('canvas')
		expect(canvas).not.toBeNull()
		expect(canvas?.width).toBe(200)
	})

	it('should execute draw without crashing', () => {
		const drawing = new CanvasDrawing(container, options as any)
		const model = new QRCodeModel(1, QrErrorCorrectLevel.L)
		model.addData('Vitest')
		model.make()

		// Verificamos que no lance excepciones al iterar módulos y finders
		expect(() => drawing.draw(model)).not.toThrow()
	})

	it('should clear the canvas', () => {
		const drawing = new CanvasDrawing(container, options as any)
		expect(() => drawing.clear()).not.toThrow()
	})
})
