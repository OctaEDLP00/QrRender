// @vitest-environment node
import { ConsoleDrawing } from '../../src/renderer/ConsoleDrawing.js'
import { QRCodeModel, QrErrorCorrectLevel } from '@qr-render/core'
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ConsoleDrawing', () => {
	const options = {
		quietZone: 2,
	}

	beforeEach(() => {
		// Limpiamos los mocks antes de cada test
		vi.restoreAllMocks()
	})

	/**
	 * Test para verificar que se escribe en el stdout
	 */
	it('should write the QR code to process.stdout', () => {
		// Spy on stdout's write method
		const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

		const drawing = new ConsoleDrawing(options as any)
		const model = new QRCodeModel(1, QrErrorCorrectLevel.L)
		model.addData('CLI')
		model.make()

		drawing.draw(model)

		// Verificamos que se haya llamado a write
		expect(stdoutSpy).toHaveBeenCalled()

		// Expect the output to contain the ANSI foreground codes and blocks
		const output = stdoutSpy.mock.calls[0][0] as string
		expect(output).toContain('\x1b[30m') // fg dark
		expect(output).toContain('\x1b[97m') // fg light
		expect(output).toContain('\x1b[0m') // RESET
		expect(output).toContain('██') // modules painted with full glyphs
		expect(output).not.toContain('\x1b[40m') // sin backgrounds: sin seams
		expect(output).not.toContain('\x1b[47m')
	})

	/**
	 * Test to verify the output size according to quietZone
	 */
	it('should respect the quietZone in the terminal output', () => {
		const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

		const quietZone = 1
		const drawing = new ConsoleDrawing({ quietZone } as any)
		const model = new QRCodeModel(1, QrErrorCorrectLevel.L) // Size 21
		model.make()

		drawing.draw(model)

		const output = stdoutSpy.mock.calls[0][0] as string
		const lines = output.trim().split('\n')

		// Total lines: 21 (modules) + 2 (1 quietZone line above and 1 below)
		// The QR Version 1 model has 21 modules
		expect(lines.length).toBe(21 + quietZone * 2)
	})

	/**
	 * Test for the clear method
	 */
	it('should call stdout.write with the clear screen ANSI sequence', () => {
		const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
		const drawing = new ConsoleDrawing(options as any)

		drawing.clear()

		// Verificamos la secuencia de escape para limpiar pantalla
		expect(stdoutSpy).toHaveBeenCalledWith('\x1b[2J\x1b[0f')
	})
})
