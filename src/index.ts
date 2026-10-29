import defu from 'defu'
import { defineNitroModule } from 'nitropack/kit'
import { resolveHandlerBasePath } from './runtime/utils/base-url'
import { addUserConfig } from './template/user-options'
import { addHandler, addImports, addPlugin, addTypeReference, createResolver } from './utils/nitro'

export { resolveAuthBaseURL, resolveHandlerBasePath } from './runtime/utils/base-url'

export interface ModuleOptions {
	singleton?: 'app' | 'request'
	handlerPath?: string
	/** Enable automatic Server Base URL and Base Path resolution. @default true */
	autoBaseURL?: boolean
	options?: {
		path: string
	}
}

const DEFAULT_OPTIONS = {
	singleton: 'app',
	options: {
		path: 'better-auth/server-options',
	},
	handlerPath: '/api/auth/**',
	autoBaseURL: true,
}

export default defineNitroModule({
	name: 'nitro-better-auth',
	async setup(nitro) {
		const options = defu(nitro.options.betterAuth, DEFAULT_OPTIONS)
		const resolver = createResolver(import.meta.url)
		const handlerBasePath = resolveHandlerBasePath(options.handlerPath)

		nitro.options.runtimeConfig.nitroBetterAuth = {
			nitroBasePath: nitro.options.baseURL || '/',
			handlerBasePath: handlerBasePath || '',
			autoBaseURL: options.autoBaseURL,
		}

		nitro.options.externals ??= {} as any
		nitro.options.externals.inline ??= []
		nitro.options.externals.inline.push(
			resolver.resolve('./runtime'),
		)

		addTypeReference(
			nitro,
			'nitro-better-auth',
		)

		switch (options.singleton) {
			case 'request':
				addPlugin(
					nitro,
					resolver.resolve('./runtime/plugins/auth-request'),
				)
				if (nitro.options.experimental.asyncContext === true) {
					addImports(
						nitro,
						[{
							name: 'useBetterAuth',
							from: resolver.resolve('./runtime/utils/better-auth-request'),
						}],
					)
				}
				else {
					addImports(
						nitro,
						[{
							name: 'useBetterAuth',
							from: resolver.resolve('./runtime/utils/better-auth-request-event'),
						}],
					)
				}
				break
			case 'app':
			default:
				addPlugin(
					nitro,
					resolver.resolve('./runtime/plugins/auth'),
				)
				addImports(
					nitro,
					[{
						name: 'useBetterAuth',
						from: resolver.resolve('./runtime/utils/better-auth'),
					}],
				)
				break
		}
		addImports(
			nitro,
			[{
				name: 'AuthenticateMiddleware',
				from: resolver.resolve('./runtime/utils/auth-middleware'),
			}, {
				name: 'AuthenticateMiddleware',
				as: 'AuthMiddleware',
				from: resolver.resolve('./runtime/utils/auth-middleware'),
			}],
		)
		addHandler(nitro, {
			route: options.handlerPath,
			handler: resolver.resolve('./runtime/api/auth'),
		})
		await addUserConfig(
			nitro,
			options.options.path,
		)
	},
})

declare module 'nitropack' {
	interface NitroOptions {
		betterAuth?: ModuleOptions
	}
	interface NitroConfig {
		betterAuth?: ModuleOptions
	}
}
