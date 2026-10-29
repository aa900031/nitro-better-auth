import { describe, expect, it, vi } from 'vitest'
import { withDevTrustedOrigins } from './trusted-origins'

type TrustedOriginsResolver = (request?: Request) => Promise<string[]>

const devOrigins = [
	'http://localhost:4567',
	'http://dev.example.com:4567',
]

describe('development trusted origins', () => {
	it.each([
		[['https://app.example.com']],
		[async () => ['https://app.example.com']],
	])('returns production configuration unchanged', (trustedOrigins) => {
		expect(withDevTrustedOrigins(trustedOrigins as any, {
			dev: false,
			autoBaseURL: true,
			devOrigins,
		})).toBe(trustedOrigins)
	})

	it('returns configuration unchanged when automatic resolution is disabled', () => {
		const trustedOrigins = ['https://app.example.com']
		expect(withDevTrustedOrigins(trustedOrigins, {
			dev: true,
			autoBaseURL: false,
			devOrigins,
		})).toBe(trustedOrigins)
	})

	it('merges an array with development origins without empty values or duplicates', async () => {
		const resolved = withDevTrustedOrigins([
			'https://app.example.com',
			'',
			'http://localhost:4567',
		] as any, {
			dev: true,
			autoBaseURL: true,
			devOrigins,
		})

		expect(typeof resolved).toBe('function')
		await expect((resolved as unknown as TrustedOriginsResolver)(undefined)).resolves.toEqual([
			'https://app.example.com',
			'http://localhost:4567',
			'http://dev.example.com:4567',
		])
	})

	it('preserves the callback request and adds its origin', async () => {
		const request = new Request('http://127.0.0.1:4567/api/auth/session')
		const trustedOrigins = vi.fn(async (received?: Request) => [
			received === request ? 'https://app.example.com' : undefined,
			null,
		])
		const resolved = withDevTrustedOrigins(trustedOrigins, {
			dev: true,
			autoBaseURL: true,
			devOrigins,
		})

		await expect((resolved as unknown as TrustedOriginsResolver)(request)).resolves.toEqual([
			'https://app.example.com',
			'http://localhost:4567',
			'http://dev.example.com:4567',
			'http://127.0.0.1:4567',
		])
		expect(trustedOrigins).toHaveBeenCalledWith(request)
	})

	it('supports missing configuration and an undefined Request', async () => {
		const resolved = withDevTrustedOrigins(undefined, {
			dev: true,
			autoBaseURL: true,
			devOrigins,
		})

		await expect((resolved as unknown as TrustedOriginsResolver)(undefined)).resolves.toEqual(devOrigins)
	})
})
