/**
 * Crea GitHub Releases para las tags que ya existen en el repo.
 *
 * Patrón de tag (el que genera `changeset publish`): `@qr-render/<pkg>@<ver>`.
 * Tag-driven: NO crea ni mueve tags nunca; sólo publica un release por tag
 * que todavía no tenga uno (idempotente).
 *
 * Las notas se extraen del CHANGELOG.md del paquete (sección `## <version>`
 * generada por changesets, hasta el próximo `## `); si no está el archivo o
 * la versión, cae a `(sin changelog)`.
 *
 * Uso: node create-github-releases.mjs
 * Requiere: GH_TOKEN (o gh autenticado), `gh` en el PATH.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const TAG_RE = /^@qr-render\/([a-z-]+)@([0-9]+\.[0-9]+\.[0-9]+(?:-[\w.]+)?)$/

const exec = (cmd, opts = {}) =>
	execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts })

/**
 * Extrae de packages/<pkg>/CHANGELOG.md la sección `## <version>` hasta el
 * próximo encabezado `## `. Devuelve el cuerpo sin el encabezado y, si el
 * archivo o la versión no existen, un fallback informativo.
 */
const changelogBody = (pkg, version) => {
	const file = join(process.cwd(), 'packages', pkg, 'CHANGELOG.md')
	if (!existsSync(file)) {
		return `(sin changelog — \`@qr-render/${pkg}\` salió sin changeset pendiente; los próximos releases traen notas de \`CHANGELOG.md\`)`
	}
	const escaped = version.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
	const heading = new RegExp(`^## ${escaped}(?:\\s.*)?$`, 'm')
	const source = readFileSync(file, 'utf8')
	const start = source.search(heading)
	if (start === -1) {
		return `(la sección \`## ${version}\` no figura en \`CHANGELOG.md\`)`
	}
	const rest = source.slice(start)
	const end = rest.indexOf('\n## ', 1)
	const body = (end === -1 ? rest : rest.slice(0, end))
		.split('\n')
		.slice(1)
		.join('\n')
	return body.trim() || '(sin changelog)'
}

const releaseExists = tag => {
	try {
		exec(`gh release view ${tag}`)
		return true
	} catch {
		return false
	}
}

// Todas las tags del repo con el patrón `@qr-render/<pkg>@<ver>`.
const tags = exec('git tag -l --sort=creatordate')
	.split('\n')
	.map(line => line.trim())
	.filter(Boolean)
	.map(tag => {
		const match = TAG_RE.exec(tag)
		return match ? { tag, pkg: match[1], version: match[2] } : null
	})
	.filter(Boolean)

if (tags.length === 0) {
	console.log('sin tags con patrón @qr-render/<pkg>@<ver> — nada que publicar')
	process.exit(0)
}

const notesFile = join(process.cwd(), '.release-notes.tmp.md')

for (const { tag, pkg, version } of tags) {
	if (releaseExists(tag)) {
		console.log(`skip ${tag} (release ya existente)`)
		continue
	}

	writeFileSync(notesFile, `${changelogBody(pkg, version)}\n`)
	try {
		exec(
			`gh release create ${tag} --verify-tag --title ${JSON.stringify(tag)} --notes-file ${JSON.stringify(notesFile)}`
		)
		console.log(`release ${tag} creado`)
	} finally {
		unlinkSync(notesFile)
	}
}
