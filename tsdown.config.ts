import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'
import packageJson from './package.json' with { type: 'json' }

const base = {
	format: ['esm'],
	shims: true,
	dts: true,
	external: [
		'h3',
		...Object.keys(packageJson.peerDependencies || {}),
	],
	ignoreWatch: [
		new URL('./playground', import.meta.url).pathname,
	],
} satisfies UserConfig

export default defineConfig([
	{
		...base,
		entry: [
			'src/index.ts',
			'!src/runtime/**/*',
		],
	},
	{
		...base,
		entry: {
			'runtime/*': [
				'src/runtime/**/*.ts',
				'!**/*.stories.{js,cts,mts,ts,jsx,tsx}',
				'!**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}',
			],
		},
		unbundle: true,
		external: [
			...base.external,
			'#imports',
			'#nitro-better-auth/server-options.mjs',
		],
		outExtensions: () => ({
			js: '.js',
			dts: '.d.ts',
		}),
	},
])
