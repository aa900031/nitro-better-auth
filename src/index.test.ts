import type { Nitro } from 'nitropack'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import nitroBetterAuth from './index'

vi.mock('chokidar', () => ({
	watch: () => ({
		close: async () => {},
		on() {
			return this
		},
	}),
}))

describe('nitro better Auth module', () => {
	let nitro: Nitro | undefined
	let rootDir: string | undefined

	afterEach(async () => {
		await nitro?.close()
		if (rootDir !== undefined)
			await rm(rootDir, { recursive: true, force: true })
	})

	it('registers the base path and exposes runtime candidates', async () => {
		rootDir = await mkdtemp(join(tmpdir(), 'nitro-better-auth-'))
		const optionsDir = join(rootDir, 'better-auth')
		await mkdir(optionsDir)
		await writeFile(join(optionsDir, 'server-options.ts'), 'export default () => ({})')
		const closeHooks: Array<() => Promise<void>> = []
		nitro = {
			options: {
				rootDir,
				srcDir: rootDir,
				buildDir: join(rootDir, '.nitro'),
				dev: false,
				betterAuth: {
					mountPath: '/custom-auth',
				},
				experimental: {},
				externals: { inline: [] },
				handlers: [],
				ignore: [],
				imports: { imports: [] },
				plugins: [],
				typescript: { tsConfig: {} },
				virtual: {},
			},
			hooks: {
				hook(name: string, callback: () => Promise<void>) {
					if (name === 'close')
						closeHooks.push(callback)
				},
			},
			close: async () => {
				await Promise.all(closeHooks.map(callback => callback()))
			},
		} as unknown as Nitro
		await nitroBetterAuth.setup(nitro)

		expect(nitro.options.handlers).toContainEqual(expect.objectContaining({
			route: '/custom-auth/**',
		}))
		const virtualModule = nitro.options.virtual['#nitro-better-auth/server-options.mjs']
		expect(virtualModule).toBeTypeOf('function')
		expect(await (virtualModule as () => Promise<string>)()).not.toContain('moduleOptions')
		const context = nitro.options.virtual['#nitro-better-auth/server-options-context.mjs']
		expect(context).toBeTypeOf('function')
		const contextSource = await (context as () => string)()
		expect(contextSource).toContain('mountPath: "/custom-auth"')
		expect(contextSource).toContain('dev: false')
	})
})
