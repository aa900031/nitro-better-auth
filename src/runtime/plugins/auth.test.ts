import type { H3Event } from 'h3'
import type { NitroApp } from 'nitropack'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authPlugin from './auth'

const mocks = vi.hoisted(() => ({
	serverOptionsContextConfig: {
		dev: false,
		mountPath: '/api/auth',
	},
	createBetterAuth: vi.fn(() => ({})),
	loadServerOptions: vi.fn(() => ({})),
	runtimeConfig: {
		app: { baseURL: '/shop/' },
		public: { siteUrl: 'https://site.example.com/path' as string | undefined },
	},
	nitroApp: undefined as unknown,
}))

vi.mock('better-auth', () => ({
	betterAuth: mocks.createBetterAuth,
}))

vi.mock('#imports', () => ({
	defineNitroPlugin: (plugin: unknown) => plugin,
	useRuntimeConfig: () => mocks.runtimeConfig,
	useNitroApp: () => mocks.nitroApp,
}))

vi.mock('#nitro-better-auth/server-options-context.mjs', () => ({
	default: mocks.serverOptionsContextConfig,
}))

vi.mock('#nitro-better-auth/server-options.mjs', () => ({
	default: mocks.loadServerOptions,
}))

describe('auth plugin', () => {
	let requestHook: (event: H3Event) => void

	beforeEach(() => {
		mocks.serverOptionsContextConfig.dev = false
		mocks.createBetterAuth.mockClear()
		mocks.createBetterAuth.mockImplementation(() => ({}))
		mocks.loadServerOptions.mockClear()
		mocks.runtimeConfig.public.siteUrl = 'https://site.example.com/path'

		const nitroApp = {
			hooks: {
				hook: vi.fn((_name, callback) => {
					requestHook = callback
				}),
			},
		} as unknown as NitroApp
		mocks.nitroApp = nitroApp
		authPlugin(nitroApp)
	})

	it('lazily shares one instance across requests when the baseURL is configured', () => {
		const firstEvent = createEvent('first.example.com')
		const secondEvent = createEvent('second.example.com')
		requestHook(firstEvent)
		requestHook(secondEvent)

		expect(mocks.createBetterAuth).not.toHaveBeenCalled()
		const firstInstance = firstEvent.context.betterAuth
		expect(firstEvent.context.betterAuth).toBe(firstInstance)
		expect(secondEvent.context.betterAuth).toBe(firstInstance)
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(1)
		expect(mocks.loadServerOptions).toHaveBeenCalledWith({
			basePath: '/shop/api/auth',
			baseURL: 'https://site.example.com',
		})
	})

	it('caches one instance per inferred origin in development', () => {
		mocks.serverOptionsContextConfig.dev = true
		mocks.runtimeConfig.public.siteUrl = undefined
		const firstEvent = createEvent('first.example.com')
		const sameOriginEvent = createEvent('first.example.com')
		const secondEvent = createEvent('second.example.com')
		requestHook(firstEvent)
		requestHook(sameOriginEvent)
		requestHook(secondEvent)

		expect(firstEvent.context.betterAuth).toBe(sameOriginEvent.context.betterAuth)
		expect(secondEvent.context.betterAuth).not.toBe(firstEvent.context.betterAuth)
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(2)
		expect(mocks.loadServerOptions).toHaveBeenNthCalledWith(1, {
			basePath: '/shop/api/auth',
			baseURL: 'https://first.example.com',
		})
		expect(mocks.loadServerOptions).toHaveBeenNthCalledWith(2, {
			basePath: '/shop/api/auth',
			baseURL: 'https://second.example.com',
		})
	})

	it('does not redefine an existing betterAuth context property', () => {
		const event = createEvent('first.example.com')
		requestHook(event)
		const instance = event.context.betterAuth
		expect(() => requestHook(event)).not.toThrow()
		expect(event.context.betterAuth).toBe(instance)
	})
})

function createEvent(host: string): H3Event {
	return {
		context: {},
		path: '/shop/api/auth/session',
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
