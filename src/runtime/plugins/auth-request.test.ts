import type { H3Event } from 'h3'
import type { NitroApp } from 'nitropack'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authRequestPlugin from './auth-request'

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
}))

vi.mock('better-auth', () => ({
	betterAuth: mocks.createBetterAuth,
}))

vi.mock('#imports', () => ({
	defineNitroPlugin: (plugin: unknown) => plugin,
	useRuntimeConfig: () => mocks.runtimeConfig,
}))

vi.mock('#nitro-better-auth/server-options-context.mjs', () => ({
	default: mocks.serverOptionsContextConfig,
}))

vi.mock('#nitro-better-auth/server-options.mjs', () => ({
	default: mocks.loadServerOptions,
}))

describe('request auth plugin', () => {
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
		authRequestPlugin(nitroApp)
	})

	it('lazily caches one instance per event', () => {
		const firstEvent = createEvent('first.example.com')
		const secondEvent = createEvent('second.example.com')
		requestHook(firstEvent)
		requestHook(secondEvent)

		expect(mocks.createBetterAuth).not.toHaveBeenCalled()
		const firstInstance = firstEvent.context.betterAuth
		expect(firstEvent.context.betterAuth).toBe(firstInstance)
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(1)

		const secondInstance = secondEvent.context.betterAuth
		expect(secondInstance).not.toBe(firstInstance)
		expect(mocks.createBetterAuth).toHaveBeenCalledTimes(2)
		expect(mocks.loadServerOptions).toHaveBeenNthCalledWith(1, {
			basePath: '/shop/api/auth',
			baseURL: 'https://site.example.com',
		})
	})

	it('uses the current request origin in development', () => {
		mocks.serverOptionsContextConfig.dev = true
		mocks.runtimeConfig.public.siteUrl = undefined
		const event = createEvent('public.example.com')
		requestHook(event)

		expect(event.context.betterAuth).toBeDefined()
		expect(mocks.loadServerOptions).toHaveBeenCalledWith({
			basePath: '/shop/api/auth',
			baseURL: 'https://public.example.com',
		})
		expect(mocks.createBetterAuth).toHaveBeenCalledWith({
			basePath: '/shop/api/auth',
			baseURL: 'https://public.example.com',
		})
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
