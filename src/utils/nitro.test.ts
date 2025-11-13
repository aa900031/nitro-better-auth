import { isAbsolute } from 'pathe'
import { describe, expect, it } from 'vitest'
import { createResolver } from './nitro'

describe('nitro helpers', () => {
	describe('createResolver', () => {
		it('should resolve paths correctly', () => {
			const resolver = createResolver(import.meta.url)
			const path = resolver.resolve('./runtime')
			expect(isAbsolute(path)).toBeTruthy()
			expect(path).toContain('runtime')
		})

		it('should handle file:// URLs', () => {
			const resolver = createResolver('file:///path/to/base')
			const path = resolver.resolve('./runtime')
			expect(isAbsolute(path)).toBeTruthy()
		})
	})
})
