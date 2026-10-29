import { describe, expect, it } from 'vitest'
import {
	resolveAuthBaseURL,
	resolveBetterAuthOptions,
	resolveHandlerBasePath,
	resolveServerBaseURL,
	validateSiteURL,
} from './base-url'

const defaultContext = {
	dev: false,
	nitroBasePath: '/',
	handlerBasePath: '/api/auth',
}

describe('base URL resolution', () => {
	describe('validateSiteURL', () => {
		it('normalizes a valid site URL to its origin', () => {
			expect(validateSiteURL('https://example.com/some/path'))
				.toBe('https://example.com')
		})

		it.each([
			'not a url',
			'javascript:alert(1)',
			'https://user:secret@example.com',
			' https://example.com',
			'\nhttps://example.com',
		])('rejects unsafe configured URLs: %s', (url) => {
			expect(() => validateSiteURL(url)).toThrow(
				'Invalid siteUrl. Must be a valid HTTP(S) URL without credentials.',
			)
		})
	})

	describe('auth paths', () => {
		it.each([
			['/api/auth/**', '/api/auth'],
			['/auth/**', '/auth'],
			['/account/auth', '/account/auth'],
		])('resolves an unambiguous handler path %s', (handlerPath, expected) => {
			expect(resolveHandlerBasePath(handlerPath)).toBe(expected)
		})

		it.each(['/api/:tenant/auth/**', '/api/*/auth', '/api/auth/**/callback'])(
			'rejects an ambiguous handler path %s',
			(handlerPath) => {
				expect(resolveHandlerBasePath(handlerPath)).toBeUndefined()
			},
		)

		it.each([
			['https://example.com', '/', '/api/auth', 'https://example.com'],
			['https://example.com', '/dashboard/', '/api/auth', 'https://example.com/dashboard/api/auth'],
			['https://example.com', '/app/', '/auth', 'https://example.com/app/auth'],
			['https://example.com', '/a/b/', '/api/auth', 'https://example.com/a/b/api/auth'],
		])('resolves the public auth URL', (siteURL, nitroBasePath, handlerBasePath, expected) => {
			expect(resolveAuthBaseURL(siteURL, nitroBasePath, handlerBasePath)).toBe(expected)
		})
	})

	describe('resolveServerBaseURL', () => {
		it('prefers the configured site URL to BETTER_AUTH_URL and request origin', () => {
			expect(resolveServerBaseURL({
				...defaultContext,
				dev: true,
				siteURL: 'https://site.example.com/path',
				betterAuthURL: 'https://env.example.com/api/auth',
				requestOrigin: 'https://request.example.com',
			})).toBe('https://site.example.com')
		})

		it('keeps a BETTER_AUTH_URL pathname as the complete endpoint', () => {
			expect(resolveServerBaseURL({
				...defaultContext,
				betterAuthURL: 'https://auth.example.com/custom/auth',
			})).toBe('https://auth.example.com/custom/auth')
		})

		it('uses the request origin only in development', () => {
			expect(resolveServerBaseURL({
				...defaultContext,
				dev: true,
				requestOrigin: 'http://localhost:4567',
			})).toBe('http://localhost:4567')
		})

		it('uses localhost only as a development fallback', () => {
			expect(resolveServerBaseURL({
				...defaultContext,
				dev: true,
			})).toBe('http://localhost:3000')
		})

		it('ignores an invalid inferred request origin', () => {
			expect(resolveServerBaseURL({
				...defaultContext,
				dev: true,
				requestOrigin: 'javascript:alert(1)',
			})).toBe('http://localhost:3000')
		})

		it('rejects an ambiguous handler path when automatic path resolution is needed', () => {
			expect(() => resolveServerBaseURL({
				...defaultContext,
				handlerBasePath: '',
				siteURL: 'https://example.com',
			})).toThrow('Cannot infer an auth endpoint from handlerPath')
		})

		it('ignores request origins and fails without configuration in production', () => {
			expect(() => resolveServerBaseURL({
				...defaultContext,
				requestOrigin: 'https://forged.example.com',
			})).toThrow('[nitro-better-auth] siteUrl required in production.')
		})
	})

	describe('resolveBetterAuthOptions', () => {
		it('preserves an explicit baseURL including its pathname', () => {
			const options = {
				baseURL: 'https://auth.example.com/custom/auth',
				basePath: '/ignored-by-this-resolver',
			}

			expect(resolveBetterAuthOptions(options, {
				...defaultContext,
				siteURL: 'https://site.example.com',
			})).toBe(options)
		})

		it('injects a resolved baseURL when the user did not provide one', () => {
			expect(resolveBetterAuthOptions({ basePath: '/api/auth' }, {
				...defaultContext,
				siteURL: 'https://site.example.com',
			})).toEqual({
				basePath: '/api/auth',
				baseURL: 'https://site.example.com',
			})
		})
	})
})
