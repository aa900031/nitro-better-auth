import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import type { H3Event } from 'h3'
import type { BetterAuthRuntimeConfig } from '../utils/auth-runtime'
import process from 'node:process'
import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'
import { betterAuth as createBetterAuth } from 'better-auth'
import { resolveRuntimeBetterAuthOptions } from '../utils/auth-runtime'
import { createInferredBaseURLWarning } from '../utils/runtime-origin'

export default defineNitroPlugin((nitroApp) => {
	const warnInferred = createInferredBaseURLWarning(message => console.warn(message))
	const instances = new Map<string | undefined, BetterAuthResult>()
	Object.defineProperty(nitroApp, '_betterAuth', {
		get: () => getter(),
	})
	nitroApp.hooks.hook('request', (event) => {
		Object.defineProperty(event.context, 'betterAuth', {
			get: () => getter(event),
		})
	})

	let optionsLoaded = false
	let loadedOptions: ReturnType<typeof loadServerOptions> | undefined
	function getter(event?: H3Event): BetterAuthResult {
		if (!optionsLoaded) {
			loadedOptions = loadServerOptions()
			optionsLoaded = true
		}
		const opts = loadedOptions || {}
		const runtimeConfig = useRuntimeConfig(event) as unknown as BetterAuthRuntimeConfig
		const resolved = resolveRuntimeBetterAuthOptions(opts, {
			dev: import.meta.dev === true,
			env: process.env,
			event,
			runtimeConfig,
			onInferred: warnInferred,
			warn: warning => console.warn(warning),
		})
		let instance = instances.get(resolved.cacheKey)
		if (!instance) {
			instance = createBetterAuth(resolved.options)
			instances.set(resolved.cacheKey, instance)
		}
		return instance
	}
})

declare module 'nitropack' {
	interface NitroApp {
		_betterAuth: BetterAuthResult
	}
}

declare module 'h3' {
	interface H3EventContext {
		betterAuth: BetterAuthResult
	}
}
