import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import type { H3Event } from 'h3'
import type { BetterAuthRuntimeConfig } from '../utils/auth-runtime'
import process from 'node:process'
import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'
import { betterAuth as createBetterAuth } from 'better-auth'
import { createRequestInstanceCache, resolveRuntimeBetterAuthOptions } from '../utils/auth-runtime'
import { createInferredBaseURLWarning } from '../utils/runtime-origin'

export default defineNitroPlugin((nitroApp) => {
	const instances = createRequestInstanceCache<H3Event, BetterAuthResult>()
	const warnInferred = createInferredBaseURLWarning(message => console.warn(message))
	nitroApp.hooks.hook('request', (event) => {
		Object.defineProperty(event.context, 'betterAuth', {
			get: () => instances.get(event, () => {
				const opts = loadServerOptions()
				const runtimeConfig = useRuntimeConfig(event) as unknown as BetterAuthRuntimeConfig
				const resolved = resolveRuntimeBetterAuthOptions(opts || {}, {
					dev: import.meta.dev === true,
					env: process.env,
					event,
					runtimeConfig,
					onInferred: warnInferred,
					warn: warning => console.warn(warning),
				})
				return createBetterAuth(resolved.options)
			}),
		})
	})
})

declare module 'h3' {
	interface H3EventContext {
		betterAuth: BetterAuthResult
	}
}
