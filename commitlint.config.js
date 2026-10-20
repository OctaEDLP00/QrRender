/**
 * commitlint — conventional commits para el monorepo @qr-render.
 * Referencias de scope: core | web | cli | docs | deps | repo | ci | release.
 * @type {import('cz-adapter-email').UserConfig}
 */
const config = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'header-max-length': [2, 'always', 100],
		'type-enum': [
			2,
			'always',
			[
				'build',
				'chore',
				'ci',
				'docs',
				'feat',
				'fix',
				'perf',
				'refactor',
				'revert',
				'style',
				'test',
			],
		],
		'scope-enum': [
			1,
			'always',
			['core', 'web', 'cli', 'docs', 'deps', 'repo', 'ci', 'release'],
		],
	},
}

module.exports = config
