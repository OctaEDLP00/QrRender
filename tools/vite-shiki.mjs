#!/usr/bin/env node
/**
 * Plugin de Vite: resalta los bloques de código de docs/index.html con Shiki
 * (build-time, sin CDN ni JS en runtime). Aplica a dev y build vía el hook
 * `transformIndexHtml`.
 */
import { codeToHtml } from 'shiki'

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

const blockRe = /<pre><code class="language-([\w-]+)">([\s\S]*?)<\/code><\/pre>/g

export function shikiHighlight() {
	return {
		name: 'qr-render:shiki-highlight',
		/**
		 * @param {string} html HTML de la página de entrada, pre-transform.
		 * @returns {Promise<string>} HTML con los bloques sustituidos por el
		 *   markup de Shiki.
		 */
		async transformIndexHtml(html) {
			const blocks = [...html.matchAll(blockRe)]

			if (blocks.length === 0) {
				console.warn('shiki: no se encontraron bloques <pre><code class="language-*">')
				return html
			}

			const replacements = await Promise.all(
				blocks.map(async ([matched, lang, body]) => {
					try {
						return { matched, html: await codeToHtml(decodeEntities(body), { lang, theme: THEME }) }
					} catch (error) {
						console.error(`shiki: error resaltando bloque "${lang}":`, error.message)
						process.exitCode = 1
						return { matched, html: `<pre class="shiki ${THEME}"><code>${body}</code></pre>` }
					}
				})
			)

			let output = html
			for (const { matched, html: highlighted } of replacements) {
				output = output.replace(matched, () => highlighted)
			}
			return output
		},
	}
}
