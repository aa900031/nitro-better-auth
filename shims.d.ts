declare module '#nitro-better-auth/server-options.mjs' {
	import type { AuthOptionsFactory } from './src/config'

	const factory: AuthOptionsFactory
	export default factory
}

declare module '#nitro-better-auth/server-options-context.mjs' {
	import type { ServerOptionsContextConfig } from './src/runtime/utils/better-auth-options'

	const config: ServerOptionsContextConfig
	export default config
}

declare module '#nitro-better-auth/types/server-options' {
	import type { betterAuth } from 'better-auth'

	export type BetterAuthResult = ReturnType<typeof betterAuth>
}

declare module '#imports' {
	import type { H3Event } from 'h3'
	import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'

	export { createError, eventHandler, toWebRequest } from 'h3'
	export { defineNitroPlugin, useEvent, useNitroApp, useRuntimeConfig } from 'nitropack/runtime'
	export function useBetterAuth(event?: H3Event): BetterAuthResult
}
