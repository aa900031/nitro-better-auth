declare module '#nitro-better-auth/server-options.mjs' {
	import type { BetterAuthOptions } from 'better-auth'

	export default function (): BetterAuthOptions
}

declare module '#nitro-better-auth/types/server-options' {
	import type { betterAuth } from 'better-auth'

	export type BetterAuthResult = ReturnType<typeof betterAuth>
}

declare module '#imports' {
	import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
	import type { H3Event } from 'h3'

	export { createError, eventHandler, toWebRequest } from 'h3'
	export { defineNitroPlugin, useEvent, useNitroApp, useRuntimeConfig } from 'nitropack/runtime'
	export function useBetterAuth(event?: H3Event): BetterAuthResult
}
