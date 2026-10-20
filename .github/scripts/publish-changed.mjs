/**
 * Publica en npm cada paquete del monorepo cuya `version` de package.json
 * todavía no está publicada en el registro.
 *
 * Flujo ("publicar a través de los commits"):
 *   1. bump de `version` en packages/<pkg>/package.json dentro de un PR
 *      (p. ej. con commit `chore(release): core 0.1.1`).
 *   2. merge a `main` → este script (desde release.yml) detecta el cambio
 *      contra `npm view` y ejecuta `pnpm publish` sólo para los paquetes
 *      nuevos/cambiados.
 *
 * Requiere NODE_AUTH_TOKEN (env del workflow) y dist ya construido.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = process.cwd()
const exec = (cmd, opts = {}) =>
	execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts })

const packagesDir = join(ROOT, 'packages')
const dirs = readdirSync(packagesDir).filter((d) =>
	statSync(join(packagesDir, d)).isDirectory()
)

for (const dir of dirs) {
	const manifestPath = join(packagesDir, dir, 'package.json')
	const meta = JSON.parse(readFileSync(manifestPath, 'utf8'))
	if (meta.private) {
		console.log(`skip ${dir} (paquete privado)`)
		continue
	}

	const { name, version } = meta
	let latest = null
	try {
		latest = exec(`npm view ${name} version`).trim()
	} catch {
		// Paquete nuevo: 404 del registro → publicar sin comparación previa.
	}

	if (latest === version) {
		console.log(`skip ${name}@${version} (ya publicado)`)
		continue
	}

	console.log(
		`publish ${name}@${version}${latest ? ` (registro: ${latest})` : ' (nuevo)'}`
	)
	exec(`pnpm publish --access public --no-git-checks`, {
		cwd: join(packagesDir, dir),
	})
	console.log(`ok ${name}@${version}`)
}
