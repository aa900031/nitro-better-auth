import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	addHandler: vi.fn(),
	addImports: vi.fn(),
	addPlugin: vi.fn(),
	addTypeReference: vi.fn(),
	addUserConfig: vi.fn(),
	createResolver: vi.fn(() => ({
		resolve: (path: string) => path,
	})),
}))

vi.mock('./template/user-options', () => ({
	addUserConfig: mocks.addUserConfig,
}))

vi.mock('./utils/nitro', () => ({
	addHandler: mocks.addHandler,
	addImports: mocks.addImports,
	addPlugin: mocks.addPlugin,
	addTypeReference: mocks.addTypeReference,
	createResolver: mocks.createResolver,
}))

const { default: betterAuthModule } = await import('./index')

describe('nitro module lifecycle setup', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it.each([
		[true, './runtime/utils/better-auth-request'],
		[false, './runtime/utils/better-auth-request-event'],
	])('keeps request singleton imports aligned with asyncContext=%s', async (asyncContext, expected) => {
		const nitro = {
			options: {
				betterAuth: { singleton: 'request' },
				baseURL: '/',
				experimental: { asyncContext },
				externals: { inline: [] },
				runtimeConfig: {},
			},
		}

		await betterAuthModule.setup(nitro as any)

		const imports = mocks.addImports.mock.calls.flatMap((call: any[]) => call[1])
		expect(imports).toContainEqual(expect.objectContaining({
			name: 'useBetterAuth',
			from: expected,
		}))
		expect(nitro.options.runtimeConfig).toMatchObject({
			nitroBetterAuth: { autoBaseURL: true },
		})
	})
})
