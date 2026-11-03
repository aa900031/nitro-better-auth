import type { BetterAuthOptions } from 'better-auth'
import type { H3Event } from 'h3'
import type { NitroRuntimeConfig } from 'nitropack/types'
import type { AuthOptionsFactory } from '../../config'
import type { ServerOptionsContextConfig } from './better-auth-options'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveBetterAuthOptions } from './better-auth-options'

const mocks = vi.hoisted(() => ({
	contextConfig: {
		dev: false,
		mountPath: '/api/auth',
	},
	loadServerOptions: vi.fn(),
}))

vi.mock('#nitro-better-auth/server-options-context.mjs', () => ({
	default: mocks.contextConfig,
}))

vi.mock('#nitro-better-auth/server-options.mjs', () => ({
	default: mocks.loadServerOptions,
}))

const ENV_KEYS = [
	'BETTER_AUTH_URL',
	'VERCEL_URL',
	'CF_PAGES_URL',
	'URL',
	'NITRO_HOST',
	'HOST',
	'NITRO_PORT',
	'PORT',
	'NITRO_SSL_CERT',
	'NITRO_SSL_KEY',
	'__NUXT_DEV__',
	'NUXT_VITE_NODE_OPTIONS',
] as const

function resolveOptions(
	contextConfig: ServerOptionsContextConfig,
	runtimeConfig: NitroRuntimeConfig = createRuntimeConfig(),
	factory: AuthOptionsFactory = () => ({}),
	event?: H3Event,
): BetterAuthOptions {
	Object.assign(mocks.contextConfig, contextConfig)
	mocks.loadServerOptions.mockImplementation(factory)
	return resolveBetterAuthOptions(runtimeConfig, event)
}

function createRuntimeConfig(
	baseURL = '/',
	siteUrl?: string,
	betterAuth?: NitroRuntimeConfig['betterAuth'],
): NitroRuntimeConfig {
	return {
		app: { baseURL },
		nitro: {},
		public: { siteUrl },
		betterAuth,
	}
}

describe('better Auth option candidates', () => {
	beforeEach(() => {
		for (const key of ENV_KEYS)
			vi.stubEnv(key, undefined)
		mocks.contextConfig.dev = false
		mocks.contextConfig.mountPath = '/api/auth'
		mocks.loadServerOptions.mockReset()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it.each([
		['VERCEL_URL', 'deployment.vercel.app', 'https://deployment.vercel.app'],
		['CF_PAGES_URL', 'https://deployment.pages.dev/path', 'https://deployment.pages.dev'],
		['URL', 'https://deployment.netlify.app', 'https://deployment.netlify.app'],
		['URL', 'deployment.netlify.app', 'https://deployment.netlify.app'],
	])('uses %s as the production origin', (name, value, expected) => {
		vi.stubEnv(name, value)

		expect(resolveOptions({ mountPath: '/api/auth', dev: false }).baseURL)
			.toBe(expected)
	})

	it('omits production baseURL when no source is usable', () => {
		expect(resolveOptions({ mountPath: '/api/auth', dev: false })).toEqual({
			basePath: '/api/auth',
		})
	})

	it('does not infer baseURL when Better Auth owns it', () => {
		vi.stubEnv('BETTER_AUTH_URL', 'https://auth.example.com/api/auth')
		vi.stubEnv('VERCEL_URL', 'project.vercel.app')

		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', 'https://site.example.com'),
		)).toEqual({
			basePath: '/api/auth',
		})
	})

	it('ignores an empty BETTER_AUTH_URL when inferring baseURL', () => {
		vi.stubEnv('BETTER_AUTH_URL', '')

		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', 'https://site.example.com'),
		).baseURL).toBe('https://site.example.com')
	})

	it('prefers the site URL origin and skips an invalid site URL', () => {
		vi.stubEnv('VERCEL_URL', 'project.vercel.app')

		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', 'https://site.example.com/path'),
		).baseURL).toBe('https://site.example.com')
		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', 'not a URL'),
		).baseURL).toBe('https://project.vercel.app')
	})

	it('includes a non-root Nitro app base in the auth URL', () => {
		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/shop/', 'https://site.example.com/ignored'),
		)).toEqual({
			basePath: '/shop/api/auth',
			baseURL: 'https://site.example.com',
		})
	})

	it.each([
		[{ NITRO_PORT: '4000' }, 'http://localhost:4000'],
		[{ NITRO_HOST: 'dev.example.com' }, 'http://dev.example.com:3000'],
		[{ NITRO_HOST: 'dev.example.com:4000' }, 'http://dev.example.com:4000'],
		[{ NITRO_HOST: '127.0.0.1', NITRO_PORT: '4000' }, 'http://localhost:4000'],
		[{ NITRO_HOST: '::1', NITRO_PORT: '4000' }, 'http://localhost:4000'],
		[{ NITRO_HOST: '0.0.0.0', NITRO_PORT: '4000' }, 'http://0.0.0.0:4000'],
		[{ NITRO_HOST: '::', NITRO_PORT: '4000' }, 'http://[::]:4000'],
		[{ NITRO_HOST: 'dev.example.com', NITRO_SSL_CERT: 'cert', NITRO_SSL_KEY: 'key' }, 'https://dev.example.com:3000'],
	])('uses development listener settings %#', (env, baseURL) => {
		for (const [key, value] of Object.entries(env))
			vi.stubEnv(key, value)

		expect(resolveOptions({ mountPath: '/api/auth', dev: true }).baseURL).toBe(baseURL)
	})

	it('prefers Nuxt development proxy origins over listener settings', () => {
		vi.stubEnv('NITRO_HOST', 'internal.example.com')
		vi.stubEnv('__NUXT_DEV__', JSON.stringify({
			proxy: { url: 'https://public.example.com:4000/path' },
		}))

		expect(resolveOptions({ mountPath: '/api/auth', dev: true }).baseURL)
			.toBe('https://public.example.com:4000')

		vi.stubEnv('__NUXT_DEV__', undefined)
		vi.stubEnv('NUXT_VITE_NODE_OPTIONS', JSON.stringify({
			baseURL: 'http://vite-node.example.com:5000/__nuxt_vite_node__',
		}))

		expect(resolveOptions({ mountPath: '/api/auth', dev: true }).baseURL)
			.toBe('http://vite-node.example.com:5000')
	})

	it('falls back to the default development URL', () => {
		expect(resolveOptions({ mountPath: '/api/auth', dev: true }).baseURL)
			.toBe('http://localhost:3000')
	})

	it('uses a forwarded request origin only for a supplied development request', () => {
		const event = {
			path: '/api/auth/session',
			node: {
				req: {
					connection: {},
					headers: {
						'host': 'internal:3000',
						'x-forwarded-host': 'public.example.com',
						'x-forwarded-proto': 'https',
					},
				},
			},
		} as unknown as H3Event

		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: true },
			createRuntimeConfig(),
			() => ({}),
			event,
		).baseURL)
			.toBe('https://public.example.com')
		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig(),
			() => ({}),
			event,
		).baseURL)
			.toBeUndefined()
		expect(resolveOptions({ mountPath: '/api/auth', dev: true }).baseURL)
			.toBe('http://localhost:3000')
	})

	it('uses a platform URL when the request origin is invalid', () => {
		vi.stubEnv('CF_PAGES_URL', 'https://pages.example.com')
		const event = {
			path: '/',
			node: {
				req: {
					connection: {},
					headers: {
						'host': 'internal:3000',
						'x-forwarded-host': '%',
					},
				},
			},
		} as unknown as H3Event

		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: true },
			createRuntimeConfig(),
			() => ({}),
			event,
		).baseURL)
			.toBe('https://pages.example.com')
	})

	it('skips a non-http platform URL', () => {
		vi.stubEnv('CF_PAGES_URL', 'ftp://invalid.example.com')

		expect(resolveOptions({ mountPath: '/api/auth', dev: false }).baseURL)
			.toBeUndefined()
	})

	it('fills only undefined factory options', () => {
		const config = { mountPath: '/api/auth', dev: false }
		const runtimeConfig = createRuntimeConfig('/', 'https://candidate.example.com')

		expect(resolveOptions(config, runtimeConfig, () => ({
			basePath: '/custom',
			baseURL: 'https://custom.example.com',
		})))
			.toEqual({ basePath: '/custom', baseURL: 'https://custom.example.com' })
		expect(resolveOptions(config, runtimeConfig, () => ({
			basePath: undefined,
			baseURL: undefined,
		})))
			.toEqual({ basePath: '/api/auth', baseURL: 'https://candidate.example.com' })
		const dynamicBaseURL = { allowedHosts: ['example.com'] }
		expect(resolveOptions(config, runtimeConfig, () => ({ baseURL: dynamicBaseURL })).baseURL)
			.toEqual({
				allowedHosts: ['example.com'],
				fallback: 'https://candidate.example.com',
			})
		expect(dynamicBaseURL).toEqual({ allowedHosts: ['example.com'] })

		const explicitDynamicBaseURL = {
			allowedHosts: ['example.com'],
			fallback: 'https://fallback.example.com',
		}
		expect(resolveOptions(config, runtimeConfig, () => ({ baseURL: explicitDynamicBaseURL })).baseURL)
			.toBe(explicitDynamicBaseURL)
	})

	it('uses the private runtime secret when the factory does not configure secrets', () => {
		const runtimeConfig = createRuntimeConfig('/', undefined, { secret: 'runtime-secret' })

		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			runtimeConfig,
			() => ({}),
		)).toEqual({
			basePath: '/api/auth',
			secret: 'runtime-secret',
		})
		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			runtimeConfig,
			() => ({ secret: undefined }),
		).secret).toBe('runtime-secret')
	})

	it('gives factory secrets precedence over the private runtime secret', () => {
		const runtimeConfig = createRuntimeConfig('/', undefined, { secret: 'runtime-secret' })
		const secrets = [{ version: 2, value: 'factory-secret' }]

		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			runtimeConfig,
			() => ({ secret: 'factory-secret' }),
		).secret).toBe('factory-secret')
		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			runtimeConfig,
			() => ({ secrets }),
		).secrets).toBe(secrets)
	})

	it('ignores an absent or empty private runtime secret', () => {
		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', undefined, { secret: '' }),
		).secret).toBeUndefined()
	})

	it('uses private runtime baseURL and basePath before inferred values', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		vi.stubEnv('BETTER_AUTH_URL', 'https://env.example.com/api/auth')

		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', 'https://site.example.com', {
				basePath: '/runtime/auth',
				baseURL: 'https://runtime.example.com/runtime/auth',
			}),
			() => ({}),
		)).toEqual({
			basePath: '/runtime/auth',
			baseURL: 'https://runtime.example.com/runtime/auth',
		})
	})

	it('gives factory baseURL and basePath precedence over private runtime values', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', undefined, {
				basePath: '/runtime/auth',
				baseURL: 'https://runtime.example.com/runtime/auth',
			}),
			() => ({
				basePath: '/factory/auth',
				baseURL: 'https://factory.example.com/factory/auth',
			}),
		)).toEqual({
			basePath: '/factory/auth',
			baseURL: 'https://factory.example.com/factory/auth',
		})
	})

	it('falls back to the registered runtime base path when no private path is configured', () => {
		expect(resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/shop/', undefined, { baseURL: '' }),
		).basePath).toBe('/shop/api/auth')
	})

	it('warns when a private runtime basePath does not match the registered route', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', undefined, { basePath: '/runtime/auth' }),
		)

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('warns only for basePath when an origin-only baseURL accompanies a mismatch', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		resolveOptions(
			{ mountPath: '/api/auth', dev: false },
			createRuntimeConfig('/', undefined, {
				basePath: '/runtime/auth',
				baseURL: 'https://x.example.com',
			}),
		)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('basePath'))
	})

	it('warns on every explicit path mismatch', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		vi.stubEnv('BETTER_AUTH_URL', 'https://env.example.com/wrong')

		const config = { mountPath: '/api/auth', dev: false }
		resolveOptions(config, createRuntimeConfig(), () => ({
			basePath: '/wrong',
			baseURL: 'https://factory.example.com/also-wrong',
		}))
		resolveOptions(config, createRuntimeConfig(), () => ({ basePath: '/wrong' }))

		expect(warn).toHaveBeenCalledTimes(5)
	})

	it('does not warn for matching paths, origin-only URLs, or dynamic URLs', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		resolveOptions({ mountPath: '/api/auth/', dev: false }, createRuntimeConfig(), () => ({
			basePath: '/api/auth',
			baseURL: 'https://factory.example.com',
		}))
		resolveOptions({ mountPath: '/api/auth', dev: false }, createRuntimeConfig(), () => ({
			baseURL: { allowedHosts: ['example.com'] },
		}))

		expect(warn).not.toHaveBeenCalled()
	})

	it('warns for a mismatched dynamic base URL fallback', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		resolveOptions({ mountPath: '/api/auth', dev: false }, createRuntimeConfig(), () => ({
			baseURL: {
				allowedHosts: ['example.com'],
				fallback: 'https://fallback.example.com/wrong',
			},
		}))

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('accepts origin-only and full URLs for the public auth path', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const config = { mountPath: '/api/auth', dev: false }
		const runtimeConfig = createRuntimeConfig('/shop', 'https://factory.example.com')

		resolveOptions(config, runtimeConfig, () => ({
			baseURL: 'https://factory.example.com/shop/api/auth',
		}))
		resolveOptions(config, runtimeConfig, () => ({
			baseURL: 'https://factory.example.com',
		}))
		expect(warn).not.toHaveBeenCalled()

		resolveOptions(config, runtimeConfig, () => ({
			baseURL: 'https://factory.example.com/shop',
		}))
		expect(warn).toHaveBeenCalledTimes(1)
	})
})
