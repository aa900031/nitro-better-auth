import { createEvent } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import {
	createAppInstanceCache,
	createRequestInstanceCache,
	resolveRuntimeBetterAuthOptions,
} from './auth-runtime'

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

	it('reuses app instances only for the same resolved cache key', () => {
		const cache = createAppInstanceCache<object>()
		const create = vi.fn(() => ({}))

		const stable = cache.get(undefined, create)
		expect(cache.get(undefined, create)).toBe(stable)

		const first = cache.get('http://first.example.com:3000', create)
		expect(cache.get('http://first.example.com:3000', create)).toBe(first)
		expect(cache.get('http://second.example.com:4000', create)).not.toBe(first)
		expect(create).toHaveBeenCalledTimes(3)
	})

	it('reuses request instances only within the same event', () => {
		const cache = createRequestInstanceCache<object, object>()
		const create = vi.fn(() => ({}))
		const firstEvent = {}
		const secondEvent = {}

		const first = cache.get(firstEvent, create)
		expect(cache.get(firstEvent, create)).toBe(first)
		expect(cache.get(secondEvent, create)).not.toBe(first)
		expect(create).toHaveBeenCalledTimes(2)
	})
})
