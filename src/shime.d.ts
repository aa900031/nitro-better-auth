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

	export { eventHandler, toWebRequest } from 'h3'
	export { useNitroApp } from 'nitropack/runtime/internal/app'
	export { useEvent } from 'nitropack/runtime/internal/context'
	export { defineNitroPlugin } from 'nitropack/runtime/internal/plugin'
	export function useBetterAuth(): BetterAuthResult
}
