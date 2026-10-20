#!/usr/bin/env node
/**
 * Minimal zero-dependency static server for the docs/ folder (and the web bundle).
 * Usage: node tools/serve-docs.mjs [port]   (default 5173)
 */
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const PORT = Number(process.argv[2] ?? 5173)

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.json': 'application/json; charset=utf-8',
	'.md': 'text/markdown; charset=utf-8',
	'.woff2': 'font/woff2',
}

const server = createServer(async (req, res) => {
	try {
		const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)

		// '/' y '/index.html' redirigen a /docs/ para que los assets relativos funcionen
		if (requestPath === '/' || requestPath === '/index.html') {
			res.writeHead(301, { location: '/docs/' })
			res.end()
			return
		}

		const relative = requestPath.slice(1)

		// Blocked: dependencies directory and hidden files
		if (relative.includes('node_modules') || /(^\/|\/\.)/.test(relative)) {
			res.writeHead(403).end('Forbidden')
			return
		}

		const filePath = normalize(join(ROOT, relative))
		if (!filePath.startsWith(ROOT)) {
			res.writeHead(403).end('Forbidden')
			return
		}

		const info = await stat(filePath)
		const body = info.isDirectory()
			? await readFile(join(filePath, 'index.html'))
			: await readFile(filePath)

		res.writeHead(200, {
			'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
		})
		res.end(body)
	} catch {
		res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
		res.end('404 — not found')
	}
})

server.listen(PORT, () => {
	console.log(`docs servidos en http://localhost:${PORT}`)
})
