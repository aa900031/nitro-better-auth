import type { NitroApp } from 'nitropack'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authPlugin from './auth'

const mocks = vi.hoisted(() => ({
	createBetterAuth: vi.fn(() => ({ id: 'better-auth' })),
	loadServerOptions: vi.fn(() => ({})),
}))

vi.mock('better-auth', () => ({
	betterAuth: mocks.createBetterAuth,
}))

vi.mock('#imports', () => ({
	defineNitroPlugin: (plugin: unknown) => plugin,
	useRuntimeConfig: () => ({
		app: {
			baseURL: '/shop/',
		},
		public: {
			siteUrl: 'https://site.example.com/path',
		},
	}),
}))

vi.mock('#nitro-better-auth/server-options-context.mjs', () => ({
	default: {
		dev: false,
		mountPath: '/api/auth',
	},
}))

vi.mock('#nitro-better-auth/server-options.mjs', () => ({
	default: mocks.loadServerOptions,
}))

describe('app auth plugin', () => {
	beforeEach(() => {
		mocks.createBetterAuth.mockClear()
		mocks.loadServerOptions.mockClear()
	})

	it('passes the runtime site URL context through the factory', () => {
		const nitroApp = {
			hooks: {
				hook: vi.fn(),
			},
		} as unknown as NitroApp
		authPlugin(nitroApp)

		expect(nitroApp._betterAuth).toEqual({ id: 'better-auth' })
		expect(mocks.loadServerOptions).toHaveBeenCalledWith({
			basePath: '/shop/api/auth',
			baseURL: 'https://site.example.com',
		})
		expect(mocks.createBetterAuth).toHaveBeenCalledWith({
			basePath: '/shop/api/auth',
			baseURL: 'https://site.example.com',
		})
	})
})
