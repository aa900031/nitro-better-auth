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

		it('normalizes a loopback request origin in development', () => {
			expect(resolveServerBaseURL({
				...defaultContext,
				dev: true,
				requestOrigin: 'http://127.0.0.1:4567',
			})).toBe('http://localhost:4567')
		})

		it('uses a runtime environment origin after the development request origin', () => {
			expect(resolveServerBaseURL({
				...defaultContext,
				dev: true,
				environmentOrigin: {
					origin: 'https://platform.example.com',
					source: 'VERCEL_URL',
				},
			})).toBe('https://platform.example.com')
		})

		it('reports the selected inferred source with the resolved endpoint URL', () => {
			const inferred: string[] = []
			expect(resolveServerBaseURL({
				...defaultContext,
				dev: true,
				nitroBasePath: '/dashboard/',
				environmentOrigin: {
					origin: 'http://localhost:4567',
					source: 'Nitro development environment',
				},
				onInferred: (baseURL, source) => inferred.push(`${source}: ${baseURL}`),
			})).toBe('http://localhost:4567/dashboard/api/auth')
			expect(inferred).toEqual([
				'Nitro development environment: http://localhost:4567/dashboard/api/auth',
			])
		})

		it('does not report configured URLs as inferred', () => {
			const inferred: string[] = []
			resolveServerBaseURL({
				...defaultContext,
				dev: true,
				siteURL: 'https://site.example.com',
				onInferred: (baseURL, source) => inferred.push(`${source}: ${baseURL}`),
			})
			expect(inferred).toEqual([])
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
		it('returns every URL-related option untouched when automatic resolution is disabled', () => {
			const trustedOrigins = async () => ['https://trusted.example.com']
			const options = {
				basePath: '/custom/auth',
				trustedOrigins,
				advanced: { trustedProxyHeaders: true },
			}

			expect(resolveBetterAuthOptions(options, {
				...defaultContext,
				autoBaseURL: false,
				siteURL: 'not a URL',
			})).toBe(options)
		})

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

		it('preserves a dynamic Better Auth baseURL object by identity', () => {
			const baseURL = {
				allowedHosts: ['app.example.com', 'preview-*.example.com'],
				protocol: 'https',
			}
			const options = { baseURL }

			expect(resolveBetterAuthOptions(options, {
				...defaultContext,
				siteURL: 'https://site.example.com',
			})).toBe(options)
			expect(options.baseURL).toBe(baseURL)
		})

		it('adds the mounted path as basePath when an explicit baseURL contains only an origin', () => {
			const trustedOrigins = ['https://trusted.example.com']
			const advanced = { trustedProxyHeaders: true }
			const resolved = resolveBetterAuthOptions({
				baseURL: 'https://auth.example.com',
				trustedOrigins,
				advanced,
			}, {
				...defaultContext,
				nitroBasePath: '/dashboard/',
			})

			expect(resolved).toEqual({
				baseURL: 'https://auth.example.com',
				basePath: '/dashboard/api/auth',
				trustedOrigins,
				advanced,
			})
			expect(resolved.trustedOrigins).toBe(trustedOrigins)
			expect(resolved.advanced).toBe(advanced)
		})

		it('does not add the default basePath to an origin-only explicit baseURL', () => {
			const options = { baseURL: 'https://auth.example.com' }
			expect(resolveBetterAuthOptions(options, defaultContext)).toBe(options)
		})

		it('preserves an explicit basePath and warns about a development mismatch', () => {
			const warnings: string[] = []
			const options = {
				baseURL: 'https://auth.example.com',
				basePath: '/custom/auth',
			}

			expect(resolveBetterAuthOptions(options, {
				...defaultContext,
				dev: true,
				nitroBasePath: '/dashboard/',
				warn: warning => warnings.push(warning),
			})).toBe(options)
			expect(warnings).toEqual([
				'[nitro-better-auth] Better Auth basePath "/custom/auth" does not match the mounted auth path "/dashboard/api/auth".',
			])
		})

		it('does not warn about explicit basePath mismatches in production', () => {
			const warnings: string[] = []
			resolveBetterAuthOptions({ basePath: '/custom/auth' }, {
				...defaultContext,
				siteURL: 'https://site.example.com',
				warn: warning => warnings.push(warning),
			})
			expect(warnings).toEqual([])
		})

		it('preserves trustedOrigins and trusted proxy settings while injecting baseURL', () => {
			const trustedOrigins = async () => ['https://trusted.example.com']
			const advanced = { trustedProxyHeaders: true }
			const resolved = resolveBetterAuthOptions({ trustedOrigins, advanced }, {
				...defaultContext,
				siteURL: 'https://site.example.com',
			})

			expect(resolved.trustedOrigins).toBe(trustedOrigins)
			expect(resolved.advanced).toBe(advanced)
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
