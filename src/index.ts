import type { Defu } from 'defu'
import defu from 'defu'
import { defineNitroModule } from 'nitropack/kit'
import { addServerOptionsContext } from './template/server-options-context'
import { addUserConfig } from './template/user-options'
import { addAuthHandler } from './utils/auth-handler'
import { addHandler, addImports, addPlugin, addTypeReference, createResolver } from './utils/nitro'

export interface ModuleOptions {
	singleton?: 'app' | 'request'
	mountPath?: string
	options?: {
		path: string
	}
}

export type ResolvedMoudleOptions = Defu<ModuleOptions, [typeof DEFAULT_OPTIONS]>

const DEFAULT_OPTIONS = {
	singleton: 'app',
	options: {
		path: 'better-auth/server-options',
	},
	mountPath: '/api/auth',
} as const

export default defineNitroModule({
	name: 'nitro-better-auth',
	async setup(nitro) {
		const options = defu(nitro.options.betterAuth, DEFAULT_OPTIONS)
		const resolver = createResolver(import.meta.url)

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
		addAuthHandler(nitro, resolver, options)
		addServerOptionsContext(nitro, options)
		await addUserConfig(nitro, options)
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
