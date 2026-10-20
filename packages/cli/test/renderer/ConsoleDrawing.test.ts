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
		// Espiamos el método write de stdout
		const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

		const drawing = new ConsoleDrawing(options as any)
		const model = new QRCodeModel(1, QrErrorCorrectLevel.L)
		model.addData('CLI')
		model.make()

		drawing.draw(model)

		// Verificamos que se haya llamado a write
		expect(stdoutSpy).toHaveBeenCalled()

		// Verificamos que la salida contenga los códigos ANSI de primer plano y los bloques
		const output = stdoutSpy.mock.calls[0][0] as string
		expect(output).toContain('\x1b[30m') // fg dark
		expect(output).toContain('\x1b[97m') // fg light
		expect(output).toContain('\x1b[0m') // RESET
		expect(output).toContain('██') // módulos pintados con glifos completos
		expect(output).not.toContain('\x1b[40m') // sin backgrounds: sin seams
		expect(output).not.toContain('\x1b[47m')
	})

	/**
	 * Test para verificar el tamaño de la salida según el quietZone
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

		// Total de líneas: 21 (módulos) + 2 (1 de quietZone arriba y 1 abajo)
		// El modelo de QR Versión 1 tiene 21 módulos
		expect(lines.length).toBe(21 + quietZone * 2)
	})

	/**
	 * Test para el método clear
	 */
	it('should call stdout.write with the clear screen ANSI sequence', () => {
		const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
		const drawing = new ConsoleDrawing(options as any)

		drawing.clear()

		// Verificamos la secuencia de escape para limpiar pantalla
		expect(stdoutSpy).toHaveBeenCalledWith('\x1b[2J\x1b[0f')
	})
})
