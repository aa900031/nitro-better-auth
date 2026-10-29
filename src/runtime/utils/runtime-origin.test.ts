import { describe, expect, it } from 'vitest'
import {
	createInferredBaseURLWarning,
	resolveRuntimeOrigin,
} from './runtime-origin'

describe('runtime origin resolution', () => {
	it('prefers the Nuxt development proxy to Vite, listener, and platform URLs', () => {
		expect(resolveRuntimeOrigin({
			dev: true,
			env: {
				__NUXT_DEV__: JSON.stringify({ proxy: { url: 'http://127.0.0.1:4100/path' } }),
				NUXT_VITE_NODE_OPTIONS: JSON.stringify({ baseURL: 'http://localhost:4200' }),
				NITRO_HOST: 'localhost',
				NITRO_PORT: '4300',
				VERCEL_URL: 'preview.example.com',
			},
		})).toEqual({
			origin: 'http://localhost:4100',
			source: 'Nuxt development proxy',
		})
	})

	it('uses a confirmed Nuxt Vite development URL before listener settings', () => {
		expect(resolveRuntimeOrigin({
			dev: true,
			env: {
				NUXT_VITE_NODE_OPTIONS: JSON.stringify({ baseURL: 'http://127.0.0.1:4200/app' }),
				NITRO_HOST: 'localhost',
				NITRO_PORT: '4300',
			},
		})).toEqual({
			origin: 'http://localhost:4200',
			source: 'Nuxt Vite development URL',
		})
	})

	it.each([
		[
			{ NITRO_HOST: '127.0.0.1', NITRO_PORT: '4567' },
			'http://localhost:4567',
		],
		[
			{ NITRO_HOST: '::1', NITRO_PORT: '4568' },
			'http://localhost:4568',
		],
		[
			{ NITRO_HOST: '0.0.0.0', NITRO_PORT: '4569' },
			'http://localhost:4569',
		],
		[
			{ NITRO_HOST: 'dev.example.com', NITRO_PORT: '443', NITRO_SSL_CERT: 'cert', NITRO_SSL_KEY: 'key' },
			'https://dev.example.com',
		],
	])('resolves Nitro development listener settings', (env, expected) => {
		expect(resolveRuntimeOrigin({ dev: true, env })).toEqual({
			origin: expected,
			source: 'Nitro development environment',
		})
	})

	it.each([
		[{ VERCEL_URL: 'preview.example.com' }, 'https://preview.example.com', 'VERCEL_URL'],
		[{ CF_PAGES_URL: 'https://pages.example.com/path' }, 'https://pages.example.com', 'CF_PAGES_URL'],
		[{ URL: 'netlify.example.com' }, 'https://netlify.example.com', 'URL'],
	])('resolves supported production platform URLs', (env, expected, source) => {
		expect(resolveRuntimeOrigin({ dev: false, env })).toEqual({
			origin: expected,
			source,
		})
	})

	it('fails on an invalid platform URL instead of using a lower-priority source', () => {
		expect(() => resolveRuntimeOrigin({
			dev: false,
			env: {
				VERCEL_URL: 'javascript:alert(1)',
				CF_PAGES_URL: 'https://pages.example.com',
			},
		})).toThrow('Invalid VERCEL_URL')
	})

	it('ignores listener settings in production', () => {
		expect(resolveRuntimeOrigin({
			dev: false,
			env: {
				NITRO_HOST: '0.0.0.0',
				HOST: '10.0.0.8',
				NITRO_PORT: '8080',
			},
		})).toBeUndefined()
	})

	it('logs only the first inferred URL', () => {
		const warnings: string[] = []
		const warn = createInferredBaseURLWarning(message => warnings.push(message))

		warn('http://localhost:3000', 'development fallback')
		warn('http://localhost:4000', 'request origin')

		expect(warnings).toEqual([
			'[nitro-better-auth] Using inferred baseURL "http://localhost:3000" from development fallback. Set NUXT_PUBLIC_SITE_URL for deterministic OAuth callbacks.',
		])
	})
})
