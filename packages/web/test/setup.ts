import { beforeEach, afterEach } from 'vitest'
import 'vitest-canvas-mock'

beforeEach(() => {
	process.env.NODE_ENV = 'test'
})

afterEach(() => {
	const logSpy: any = console.log
	const errSpy: any = console.error
	const warnSpy: any = console.warn

	if (logSpy && typeof logSpy.mockRestore === 'function') {
		logSpy.mockRestore()
	}
	if (errSpy && typeof errSpy.mockRestore === 'function') {
		errSpy.mockRestore()
	}
	if (warnSpy && typeof warnSpy.mockRestore === 'function') {
		warnSpy.mockRestore()
	}
})
