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

	it.each([
		[{ mountPath: '/custom-auth' }, '/custom-auth', false],
		[{ handlerPath: '/custom-auth/**' }, '/custom-auth', true],
		[{ handlerPath: '/**' }, '/', true],
	] as const)('registers the base path from %j', async (betterAuth, mountPath, legacy) => {
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
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
				betterAuth,
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
		expect(warning).toHaveBeenCalledTimes(legacy ? 1 : 0)
		if (legacy)
			expect(warning).toHaveBeenCalledWith(expect.stringContaining(`mountPath: '${mountPath}'`))
		warning.mockRestore()

		expect(nitro.options.handlers).toContainEqual(expect.objectContaining({
			route: mountPath === '/' ? '/**' : `${mountPath}/**`,
		}))
		const virtualModule = nitro.options.virtual['#nitro-better-auth/server-options.mjs']
		expect(virtualModule).toBeTypeOf('function')
		expect(await (virtualModule as () => Promise<string>)()).not.toContain('moduleOptions')
		const context = nitro.options.virtual['#nitro-better-auth/server-options-context.mjs']
		expect(context).toBeTypeOf('function')
		const contextSource = await (context as () => string)()
		expect(contextSource).toContain(`mountPath: "${mountPath}"`)
		expect(contextSource).toContain('dev: false')
	})

	it.each([
		[{ handlerPath: '/custom-auth' }, 'Cannot migrate handlerPath'],
		[{ handlerPath: '/custom/*' }, 'Cannot migrate handlerPath'],
		[{ handlerPath: '/custom-auth/**', mountPath: '/other' }, 'Configure either mountPath'],
	] as const)('rejects unsupported legacy configuration %j', async (betterAuth, message) => {
		const nitro = { options: { betterAuth } } as unknown as Nitro
		await expect(nitroBetterAuth.setup(nitro)).rejects.toThrow(message)
	})
})
