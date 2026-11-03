import type { Nitro } from 'nitropack'
import type { ResolvedMoudleOptions } from '..'
import { describe, expect, it } from 'vitest'
import { addAuthHandler } from './auth-handler'

describe('addAuthHandler', () => {
	it.each([
		['/', '/**'],
		['/api/auth/', '/api/auth/**'],
	])('normalizes mountPath %j to route %j', (mountPath, route) => {
		const nitro = { options: { handlers: [] } } as unknown as Nitro
		const resolver = { resolve: () => '/runtime/api/auth' }
		const options = { mountPath } as ResolvedMoudleOptions

		addAuthHandler(nitro, resolver, options)

		expect(nitro.options.handlers).toContainEqual({
			route,
			handler: '/runtime/api/auth',
		})
	})
})
