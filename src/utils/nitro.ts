import type { Nitro, NitroEventHandler } from 'nitropack'
import type { Import } from 'unimport'
import * as process from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, normalize, resolve } from 'pathe'
import { resolvePathType } from './fs'

export function createResolver(
	base: string | URL,
): { resolve: (...path: string[]) => string } {
	base = base.toString()
	if (base.startsWith('file://')) {
		base = dirname(fileURLToPath(base))
	}
	return {
		resolve: (...path: string[]) => resolve(base, ...path),
	}
}

export function addPlugin(
	nitro: Nitro,
	path: string,
): void {
	nitro.options.plugins.push(
		normalize(path),
	)
}

export function addImports(
	nitro: Nitro,
	imports: Import[],
): void {
	if (nitro.options.imports !== false) {
		nitro.options.imports.imports ||= []
		nitro.options.imports.imports.push(
			...imports,
		)
	}
}

export function addVirtualFile(
	nitro: Nitro,
	params: {
		alias: string
		getContent: () => string | Promise<string>
	},
): void {
	nitro.options.virtual[params.alias] = params.getContent
}

export function addHandler(
	nitro: Nitro,
	handler: NitroEventHandler,
): void {
	nitro.options.handlers.push({
		...handler,
		handler: normalize(handler.handler),
	})
}

export function addTypeFile(
	nitro: Nitro,
	params: {
		alias: string
		dist: string
	},
): string {
	const typesPath = resolve(nitro.options.buildDir, 'types', params.dist)

	nitro.options.typescript.tsConfig ??= {}
	nitro.options.typescript.tsConfig.compilerOptions ??= {}
	nitro.options.typescript.tsConfig.compilerOptions.paths ??= {}
	nitro.options.typescript.tsConfig.compilerOptions.paths[params.alias] = [
		typesPath,
	]

	return typesPath
}

export function addTypeReference(
	nitro: Nitro,
	name: string,
): void {
	nitro.options.typescript.tsConfig ??= {}
	nitro.options.typescript.tsConfig.compilerOptions ??= {}
	nitro.options.typescript.tsConfig.compilerOptions.types ??= []
	nitro.options.typescript.tsConfig.compilerOptions.types.push(name)
}

export async function resolvePath(
	nitro: Nitro,
	path: string,
	opts?: {
		cwd?: string
		extensions?: string[]
	},
): Promise<string | undefined> {
	const cwd = opts?.cwd || nitro.options.rootDir || process.cwd()
	const extensions = opts?.extensions || ['.ts', '.mjs', '.cjs', '.json']
	if (!isAbsolute(path)) {
		path = resolve(cwd, path)
	}

	const res = await resolvePathType(path)
	if (res && res.type === 'file') {
		return res.path
	}
	for (const ext of extensions) {
		const extPath = await resolvePathType(`${path}${ext}`)
		if (extPath && extPath.type === 'file') {
			return extPath.path
		}
	}
}
