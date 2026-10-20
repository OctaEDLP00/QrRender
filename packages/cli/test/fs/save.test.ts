// @vitest-environment node
import { resolveOutput, saveQrFile } from '../../src/fs/save.js'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, afterAll } from 'vitest'

const tmpRoot = path.join(os.tmpdir(), `qr-cli-tests-${randomUUID()}`)
const cleanup: string[] = []

afterAll(() => {
	for (const file of cleanup) {
		fs.rmSync(file, { force: true })
	}
	fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('resolveOutput', () => {
	it('should default missing extensions to .png', () => {
		const { absolutePath, format } = resolveOutput('qr')
		expect(path.extname(absolutePath)).toBe('.png')
		expect(format).toBe('png')
		expect(path.isAbsolute(absolutePath)).toBe(true)
	})

	it('should autodetect svg from the extension', () => {
		const { format, absolutePath } = resolveOutput('some-dir/qr.SVG')
		expect(format).toBe('svg')
		expect(absolutePath.endsWith('qr.SVG')).toBe(true)
	})

	it('should reject unsupported extensions', () => {
		expect(() => resolveOutput('photo.jpg')).toThrow(/Unsupported output format ".jpg"/)
	})
})

describe('saveQrFile', () => {
	it('should write the file and create missing directories', async () => {
		const target = path.join(tmpRoot, 'nested', 'dir', 'qr.png')
		const data = Buffer.from([0x89, 0x50, 0x4e, 0x47])

		const written = await saveQrFile(data, target)
		cleanup.push(written)

		expect(written).toBe(path.resolve(target))
		expect(fs.existsSync(written)).toBe(true)
		expect(fs.readFileSync(written)).toEqual(data)
	})

	it('should support SVG string payloads', async () => {
		const target = path.join(tmpRoot, 'qr.svg')
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

		const written = await saveQrFile(svg, target)
		cleanup.push(written)

		expect(fs.readFileSync(written, 'utf8')).toBe(svg)
	})
})
