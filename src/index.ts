import type { Defu } from 'defu'
import type { Nitro } from 'nitropack'
import defu from 'defu'
import { defineNitroModule } from 'nitropack/kit'
import { cleanDoubleSlashes, joinURL } from 'ufo'
import { addServerOptionsContext } from './template/server-options-context'
import { addUserConfig } from './template/user-options'
import { addAuthHandler } from './utils/auth-handler'
import { addImports, addPlugin, addTypeReference, createResolver } from './utils/nitro'

export interface ModuleOptions {
	mountPath?: string
	/** @deprecated Use mountPath instead. */
	handlerPath?: string
	options?: {
		path: string
	}
}

export type ResolvedMoudleOptions = Defu<Omit<ModuleOptions, 'handlerPath'>, [typeof DEFAULT_OPTIONS]>

const DEFAULT_OPTIONS = {
	options: {
		path: 'better-auth/server-options',
	},
	mountPath: '/api/auth',
} as const

export default defineNitroModule({
	name: 'nitro-better-auth',
	async setup(nitro) {
		const options = resolveOptions(nitro)
		const resolver = createResolver(import.meta.url)

		nitro.options.runtimeConfig ??= {} as typeof nitro.options.runtimeConfig
		nitro.options.runtimeConfig.betterAuth = defu(
			nitro.options.runtimeConfig.betterAuth,
			{ baseURL: '', basePath: '', secret: '' },
		)

		nitro.options.externals ??= {} as any
		nitro.options.externals.inline ??= []
		nitro.options.externals.inline.push(
			resolver.resolve('./runtime'),
		)

		addTypeReference(
			nitro,
			'nitro-better-auth',
		)

		addPlugin(
			nitro,
			resolver.resolve('./runtime/plugins/auth'),
		)
		addImports(
			nitro,
			[{
				name: 'useBetterAuth',
				from: resolver.resolve(
					nitro.options.experimental.asyncContext === true
						? './runtime/utils/better-auth-async-context'
						: './runtime/utils/better-auth',
				),
			}],
		)
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

function resolveOptions(
	nitro: Nitro,
): ResolvedMoudleOptions {
	const { handlerPath, ...rawOptions } = nitro.options.betterAuth ?? {}
	if (handlerPath !== undefined) {
		if (rawOptions.mountPath !== undefined) {
			throw new Error(
				'[nitro-better-auth] Configure either mountPath or the deprecated handlerPath, not both. Remove handlerPath.',
			)
		}
		if (typeof handlerPath !== 'string' || !/^\/(?:[^/*:?]+\/)*\*\*$/.test(handlerPath)) {
			throw new Error(
				'[nitro-better-auth] Cannot migrate handlerPath. Use a static path ending in /**, or replace it with mountPath manually.',
			)
		}
		rawOptions.mountPath = handlerPath.slice(0, -3) || '/'
		nitro.logger.warn(`[nitro-better-auth] handlerPath is deprecated. Replace it with mountPath: '${rawOptions.mountPath}'.`)
	}
	const resolvedOptions = defu(rawOptions, DEFAULT_OPTIONS)
	resolvedOptions.mountPath = joinURL('/', cleanDoubleSlashes(resolvedOptions.mountPath))
	return resolvedOptions
}

declare module 'nitropack' {
	interface NitroOptions {
		betterAuth?: ModuleOptions
	}
	interface NitroConfig {
		betterAuth?: ModuleOptions
	}
}

declare module 'nitropack/types' {
	interface NitroRuntimeConfig {
		betterAuth?: {
			baseURL?: string
			basePath?: string
			secret?: string
		}
	}
}
