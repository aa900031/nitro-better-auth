import consola from 'consola'
import defu from 'defu'
import { defineNitroModule } from 'nitropack/kit'
import { normalize } from 'pathe'
import { addUserConfig } from './template/user-options'
import { addHandler, addImports, addPlugin, addTypeReference, createResolver } from './utils/nitro'

export interface ModuleOptions {
	singleton?: 'app' | 'request'
	handlerPath?: string
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
}

export default defineNitroModule({
	name: 'nitro-better-auth',
	async setup(nitro) {
		const options = defu(nitro.options.betterAuth, DEFAULT_OPTIONS)
		const resolver = createResolver(import.meta.url)

		addTypeReference(
			nitro,
			'nitro-better-auth',
		)

		switch (options.singleton) {
			case 'request':
				if (nitro.options.experimental.asyncContext !== true)
					consola.warn('Please enable "experimental.asyncContext" first.')

				addPlugin(
					nitro,
					resolver.resolve('./runtime/plugins/auth-request'),
				)
				addImports(
					nitro,
					[{
						name: 'useBetterAuth',
						from: resolver.resolve('./runtime/utils/better-auth-request'),
					}],
				)
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
		addHandler(nitro, {
			route: options.handlerPath,
			handler: normalize(resolver.resolve('./runtime/api/auth')),
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
