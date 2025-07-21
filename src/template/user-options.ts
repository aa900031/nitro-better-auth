import type { Nitro } from 'nitropack/types'
import * as fsp from 'node:fs/promises'
import { watch as watchDir } from 'chokidar'
import { genImport } from 'knitwork'
import { dirname, relative, resolve } from 'pathe'
import { addTypeFile, addVirtualFile, resolvePath } from '../utils/nitro'

export async function addUserConfig(
	nitro: Nitro,
	src: string,
) {
	addVirtualFile(nitro, {
		alias: '#nitro-better-auth/server-options.mjs',
		getContent: async () => {
			const srcFilepath = await resolvePath(nitro, src, {
				cwd: nitro.options.srcDir,
			})
			return await genContent(srcFilepath)
		},
	})

	const distTypePath = addTypeFile(nitro, {
		alias: '#nitro-better-auth/types/server-options',
		dist: 'better-auth/server-options.d.ts',
	})

	await writeFile(nitro, {
		dist: distTypePath,
		getContent: async () => {
			const srcFilepath = await resolvePath(nitro, src, {
				cwd: nitro.options.srcDir,
			})
			return await genType(srcFilepath, distTypePath)
		},
		dependences: [
			resolve(nitro.options.srcDir, src),
		],
	})
}

async function genContent(
	filepath: string | undefined,
) {
	if (filepath == null) {
		return /* javascript */`
export default () => {}
`
	}

	return /* javascript */`
${genImport(filepath, '_loader')}

let loader = _loader

export default loader
`
}

async function genType(
	src: string | undefined,
	dist: string,
): Promise<string> {
	if (src == null) {
		return /* typescript */`
import { betterAuth } from 'better-auth'

export type BetterAuthResult = ReturnType<typeof betterAuth>

`
	}

	const relativePath = relative(dirname(dist), src)
	return /* typescript */`
import { betterAuth } from 'better-auth'
${genImport(relativePath, 'ServerOptionsLoader')}

type RawOptions = ReturnType<typeof ServerOptionsLoader>

export type BetterAuthResult = ReturnType<typeof betterAuth<RawOptions>>

`
}

async function writeFile(
	nitro: Nitro,
	params: {
		dist: string
		getContent: () => string | Promise<string>
		dependences?: string[]
	},
) {
	const watcher = watchDir([
		...params.dependences ?? [],
	].map(path => dirname(path)), {
		persistent: true,
		ignored: nitro.options.ignore,
		ignoreInitial: true,
	})

	watcher.on('add', _handleWatcherChanged)
	watcher.on('unlink', _handleWatcherChanged)

	nitro.hooks.hook('close', async () => {
		await watcher.close()
	})

	await _write()

	async function _write() {
		const content = await params.getContent()
		await fsp.mkdir(dirname(params.dist), { recursive: true })
		await fsp.writeFile(params.dist, content, 'utf-8')
	}

	async function _handleWatcherChanged() {
		_write()
	}
}
