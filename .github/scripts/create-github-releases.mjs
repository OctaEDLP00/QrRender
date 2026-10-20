/**
 * Crea GitHub Releases para las tags que ya existen en el repo.
 *
 * Patrón de tag (el que genera `changeset publish`): `@qr-render/<pkg>@<ver>`.
 * Tag-driven: NO crea ni mueve tags nunca; sólo publica un release por tag
 * que todavía no tenga uno (idempotente).
 *
 * Las notas se extraen del CHANGELOG.md del paquete (sección `## <version>`
 * generada por changesets, hasta el próximo `## `); si no está el archivo o
 * la versión, cae a un fallback informativo.
 *
 * Escanea tags locales Y remotas (`git ls-remote`) para funcionar en un
 * checkout shallow, y fetea del remoto la tag que aporte una release nueva.
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

const tagExists = tag => {
	try {
		return exec(`git rev-parse -q --verify "refs/tags/${tag}"`).trim().length > 0
	} catch {
		// `git rev-parse --verify` sale con 1 si el tag no existe.
		return false
	}
}

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

// Recolecta tags locales y remotos: en un checkout shallow el corredor puede
// no tener las tags en local, y `changeset publish` puede haberlas creado en
// el remoto en un run anterior. Fuentes combinadas, sin duplicados.
const tags = new Map()
const remember = tag => {
	if (!tags.has(tag)) {
		const match = TAG_RE.exec(tag)
		if (match) tags.set(tag, { tag, pkg: match[1], version: match[2] })
	}
}
for (const tag of exec('git tag -l').split('\n').map(l => l.trim())) remember(tag)
try {
	for (const line of exec('git ls-remote --tags origin').split('\n')) {
		const at = line.indexOf('refs/tags/')
		if (at === -1 || line.includes('^{}')) continue // deref de tags anotadas
		remember(line.slice(at + 'refs/tags/'.length).trim())
	}
} catch {
	// Sin acceso al remoto (p. ej. un repo local sin origin): vale con lo local.
}

if (tags.size === 0) {
	console.log('sin tags con patrón @qr-render/<pkg>@<ver> — nada que publicar')
	process.exit(0)
}

const notesFile = join(process.cwd(), '.release-notes.tmp.md')

for (const { tag, pkg, version } of tags.values()) {
	if (releaseExists(tag)) {
		console.log(`skip ${tag} (release ya existente)`)
		continue
	}

	// La release referencia una tag que ya existe: si sólo vive en el remoto
	// (checkout shallow), la traigo antes de `gh release create --verify-tag`.
	if (!tagExists(tag)) {
		try {
			exec(`git fetch --force origin tag ${tag} --quiet`)
			console.log(`tag ${tag} feteada del remoto`)
		} catch {
			console.warn(`skip ${tag}: la tag no es local ni feteable`)
			continue
		}
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
