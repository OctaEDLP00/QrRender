#!/usr/bin/env node
/**
 * Docs build: resalta los bloques de código de docs/src/index.html con Shiki
 * (build-time, sin CDN ni JS en runtime) y escribe docs/index.html.
 */
import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { codeToHtml } from 'shiki'

const SRC = resolve(import.meta.dirname, '../docs/src/index.html')
const OUT = resolve(import.meta.dirname, '../docs/index.html')
const THEME = 'github-dark'

/**
 * Decodifica las entidades básicas del authoring HTML.
 */
const decodeEntities = html =>
	html
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'")
		.replaceAll('&amp;', '&')

const main = async () => {
	// 1) Web components (docs/src/components/) → docs/js/components.js
	await build({
		entryPoints: [resolve(import.meta.dirname, '../docs/src/components/index.ts')],
		outfile: resolve(import.meta.dirname, '../docs/js/components.js'),
		bundle: true,
		format: 'esm',
		target: 'es2022',
		sourcemap: false,
		logLevel: 'warning',
	})
	console.log('build-docs: componentes web transpilados → docs/js/components.js')

	// 2) Resaltado Shiki de los bloques de código
	const source = await readFile(SRC, 'utf8')

	const blockRe = /<pre><code class="language-([\w-]+)">([\s\S]*?)<\/code><\/pre>/g
	const blocks = [...source.matchAll(blockRe)]

	if (blocks.length === 0) {
		console.warn('build-docs: no se encontraron bloques <pre><code class="language-*">')
	}

	const highlighted = await Promise.all(
		blocks.map(async ([matched, lang, body]) => {
			try {
				return {
					matched,
					html: await codeToHtml(decodeEntities(body), { lang, theme: THEME }),
				}
			} catch (error) {
				console.error(`build-docs: error resaltando bloque "${lang}":`, error.message)
				process.exitCode = 1
				return { matched, html: `<pre class="shiki ${THEME}"><code>${body}</code></pre>` }
			}
		})
	)

	let output = source
	for (const { matched, html } of highlighted) {
		output = output.replace(matched, () => html)
	}

	// Cache-busting: ?v=<mtime> en cada asset local para que ningún navegador
	// sirva una versión vieja del bundle.
	output = output.replaceAll(/(src|href)="((?:\.\.?|\/)\S*)"/g, (match, attribute, rel) => {
		try {
			const file = statSync(resolve(OUT, '..', decodeURI(rel)))
			return `${attribute}="${rel}?v=${file.mtimeMs.toString(36)}"`
		} catch {
			return match
		}
	})

	await writeFile(OUT, output)
	console.log(`build-docs: ${highlighted.length} bloque(s) resaltado(s) con "${THEME}" → ${OUT}`)
}

main()
