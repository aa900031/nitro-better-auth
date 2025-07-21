import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
	entries: [
		'./src/index',
		{
			input: './src/runtime/',
			outDir: 'dist/runtime',
			addRelativeDeclarationExtensions: true,
			ext: 'js',
			pattern: [
				'**',
				'!**/*.stories.{js,cts,mts,ts,jsx,tsx}',
				'!**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}',
			],
		},
	],
	declaration: true,
	externals: [
		'consola',
	],
	rollup: {
		esbuild: {
			target: 'esnext',
		},
		emitCJS: false,
		cjsBridge: false,
	},
})
