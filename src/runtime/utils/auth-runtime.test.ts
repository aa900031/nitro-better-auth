import { createEvent } from 'h3'
import { describe, expect, it } from 'vitest'
import { resolveRuntimeBetterAuthOptions } from './auth-runtime'

type TrustedOriginsResolver = (request?: Request) => Promise<string[]>

const runtimeConfig = {
	nitroBetterAuth: {
		nitroBasePath: '/',
		handlerBasePath: '/api/auth',
		autoBaseURL: true,
	},
}

function event(host: string) {
	return createEvent({
		headers: { host },
		connection: {},
	} as any, {} as any)
}

describe('auth runtime lifecycle', () => {
	it('keys inferred development request origins separately', () => {
		expect(resolveRuntimeBetterAuthOptions({}, {
			dev: true,
			env: {},
			event: event('first.example.com:3000'),
			runtimeConfig,
		})).toMatchObject({
			options: { baseURL: 'http://first.example.com:3000' },
			cacheKey: 'http://first.example.com:3000',
		})

		expect(resolveRuntimeBetterAuthOptions({}, {
			dev: true,
			env: {},
			event: event('second.example.com:4000'),
			runtimeConfig,
		}).cacheKey).toBe('http://second.example.com:4000')
	})

	it.each([
		[{ baseURL: 'https://explicit.example.com' }, true, {}],
		[{}, false, { VERCEL_URL: 'preview.example.com' }],
		[{ baseURL: { allowedHosts: ['*.example.com'] } }, true, {}],
	])('keeps explicit, environment, and allowedHosts options app-scoped', (options, dev, env) => {
		expect(resolveRuntimeBetterAuthOptions(options, {
			dev,
			env,
			event: event('request.example.com'),
			runtimeConfig,
		}).cacheKey).toBeUndefined()
	})

	it('keeps an eventless development environment origin app-scoped', () => {
		expect(resolveRuntimeBetterAuthOptions({}, {
			dev: true,
			env: { NITRO_HOST: 'localhost', NITRO_PORT: '4567' },
			runtimeConfig,
		})).toMatchObject({
			options: { baseURL: 'http://localhost:4567' },
			cacheKey: undefined,
		})
	})

	it('enhances trusted origins without changing native baseURL or advanced options', async () => {
		const baseURL = { allowedHosts: ['*.example.com'] }
		const advanced = { trustedProxyHeaders: true }
		const resolved = resolveRuntimeBetterAuthOptions({
			baseURL,
			advanced,
			trustedOrigins: ['https://app.example.com'],
		}, {
			dev: true,
			env: { NITRO_HOST: 'localhost', NITRO_PORT: '4567' },
			runtimeConfig,
		})

		expect(resolved.options.baseURL).toBe(baseURL)
		expect(resolved.options.advanced).toBe(advanced)
		expect(typeof resolved.options.trustedOrigins).toBe('function')
		await expect((resolved.options.trustedOrigins as unknown as TrustedOriginsResolver)(undefined)).resolves.toEqual([
			'https://app.example.com',
			'http://localhost:4567',
		])
	})

	it('preserves the production trustedOrigins callback by identity', () => {
		const trustedOrigins = async () => ['https://app.example.com']
		const resolved = resolveRuntimeBetterAuthOptions({ trustedOrigins }, {
			dev: false,
			env: { VERCEL_URL: 'preview.example.com' },
			runtimeConfig,
		})

		expect(resolved.options.trustedOrigins).toBe(trustedOrigins)
	})

	it('does not enhance trusted origins when automatic resolution is disabled', () => {
		const options = { trustedOrigins: ['https://app.example.com'] }
		const resolved = resolveRuntimeBetterAuthOptions(options, {
			dev: true,
			env: {},
			event: event('request.example.com'),
			runtimeConfig: {
				nitroBetterAuth: {
					...runtimeConfig.nitroBetterAuth,
					autoBaseURL: false,
				},
			},
		})

		expect(resolved.options).toBe(options)
	})
})
