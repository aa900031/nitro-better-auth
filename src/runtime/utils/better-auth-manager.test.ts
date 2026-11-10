import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBetterAuth } from './better-auth'
import { useBetterAuth as useBetterAuthWithAsyncContext } from './better-auth-async-context'
import { getBetterAuth } from './better-auth-manager'
import { resetWarnOnce } from './logger'

const mocks = vi.hoisted(() => ({
	serverOptionsContextConfig: {
		dev: false,
		mountPath: '/api/auth',
	},
	createBetterAuth: vi.fn(() => ({})),
	loadServerOptions: vi.fn(() => ({})),
	runtimeConfig: {
		app: { baseURL: '/' },
		public: { siteUrl: undefined as string | undefined },
	},
	useEvent: vi.fn((): H3Event => {
		throw new Error('Nitro request context is not available')
	}),
	nitroApp: {} as Record<string, unknown>,
}))

vi.mock('better-auth', () => ({
	betterAuth: mocks.createBetterAuth,
}))

vi.mock('#imports', () => ({
	useRuntimeConfig: () => mocks.runtimeConfig,
	useEvent: mocks.useEvent,
	useNitroApp: () => mocks.nitroApp,
}))

vi.mock('#nitro-better-auth/server-options-context.mjs', () => ({
	default: mocks.serverOptionsContextConfig,
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

describe('better-auth instance cache', () => {
	const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}
	let warn: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		for (const key of ENV_KEYS) {
			savedEnv[key] = process.env[key]
			delete process.env[key]
		}
		mocks.nitroApp = {}
		resetWarnOnce()
		mocks.serverOptionsContextConfig.dev = false
		mocks.createBetterAuth.mockClear()
		mocks.createBetterAuth.mockImplementation(() => ({}))
		mocks.loadServerOptions.mockClear()
		mocks.loadServerOptions.mockImplementation(() => ({}))
		mocks.runtimeConfig.public.siteUrl = undefined
		mocks.useEvent.mockClear()
		mocks.useEvent.mockImplementation(() => {
			throw new Error('Nitro request context is not available')
		})
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warn.mockRestore()
		for (const key of ENV_KEYS) {
			if (savedEnv[key] === undefined)
				delete process.env[key]
			else
				process.env[key] = savedEnv[key]
		}
	})

	it('caches a single fallback instance for calls without an event', () => {
		const first = getBetterAuth()
		const second = getBetterAuth()

		expect(second).toBe(first)
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(1)
		expect(warn).not.toHaveBeenCalled()
	})

	it('shares the instance between requests and event-less calls when configured', () => {
		mocks.runtimeConfig.public.siteUrl = 'https://site.example.com'
		const eventless = useBetterAuth()
		const request = useBetterAuth(createEvent('other.example.com'))

		expect(request).toBe(eventless)
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(1)
		expect(warn).not.toHaveBeenCalled()
	})

	it('keys the instance by BETTER_AUTH_URL when it is set', () => {
		process.env.BETTER_AUTH_URL = 'https://auth.example.com/api/auth'
		const eventless = getBetterAuth()
		const request = getBetterAuth(createEvent('other.example.com'))

		expect(request).toBe(eventless)
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(1)
		const manager = (mocks.nitroApp as { _betterAuth?: { '~instances': Map<string | null, unknown> } })._betterAuth
		expect([...manager!['~instances'].keys()]).toEqual(['https://auth.example.com/api/auth'])
		expect(warn).not.toHaveBeenCalled()
	})

	it('warns once in development when no event is given and nothing is configured', () => {
		mocks.serverOptionsContextConfig.dev = true
		getBetterAuth()
		getBetterAuth()

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('without an event'))
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000'))
	})

	it('does not warn in development when a baseURL is configured', () => {
		mocks.serverOptionsContextConfig.dev = true
		mocks.runtimeConfig.public.siteUrl = 'https://site.example.com'
		getBetterAuth()

		expect(warn).not.toHaveBeenCalled()
	})

	it('separates the development fallback bucket from request origins', () => {
		mocks.serverOptionsContextConfig.dev = true
		const requestInstance = getBetterAuth(createEvent('public.example.com'))
		const fallbackInstance = getBetterAuth()

		expect(fallbackInstance).not.toBe(requestInstance)
		expect(getBetterAuth()).toBe(fallbackInstance)
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(2)
	})

	it('resolves the event through asyncContext when available', () => {
		mocks.serverOptionsContextConfig.dev = true
		const event = createEvent('public.example.com')
		mocks.useEvent.mockImplementation(() => event)

		useBetterAuthWithAsyncContext()

		expect(mocks.loadServerOptions).toHaveBeenCalledWith({
			basePath: '/api/auth',
			baseURL: 'https://public.example.com',
		})
	})

	it('falls back without an event when asyncContext has no request', () => {
		const instance = useBetterAuthWithAsyncContext()

		expect(mocks.useEvent).toHaveBeenCalledTimes(1)
		expect(instance).toBe(getBetterAuth())
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(1)
	})

	it('does not consult asyncContext from the plain variant', () => {
		useBetterAuth()

		expect(mocks.useEvent).not.toHaveBeenCalled()
	})
})

function createEvent(host: string): H3Event {
	return {
		context: {},
		path: '/api/auth/session',
		node: {
			req: {
				connection: {},
				headers: {
					'host': 'internal:3000',
					'x-forwarded-host': host,
					'x-forwarded-proto': 'https',
				},
			},
		},
	} as unknown as H3Event
}
