import { anonymous } from 'better-auth/plugins'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineAuthOptions } from './config'

describe('define auth options', () => {
	it('preserves the factory and its inferred plugin type', () => {
		const factory = defineAuthOptions(({ basePath }) => ({
			basePath,
			plugins: [anonymous()],
		}))
		const options = factory({ basePath: '/api/auth' })

		expect(options.basePath).toBe('/api/auth')
		expectTypeOf(options.plugins[0].id).toEqualTypeOf<'anonymous'>()
	})

	it('allows the factory to return undefined', () => {
		const factory = defineAuthOptions(() => undefined)

		expect(factory({ basePath: '/api/auth' })).toBeUndefined()
	})
})
