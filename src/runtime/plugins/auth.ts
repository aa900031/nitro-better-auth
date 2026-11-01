import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { betterAuth as createBetterAuth } from 'better-auth'
import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import { resolveBetterAuthOptions } from '../utils/better-auth-options'

export default defineNitroPlugin((nitroApp) => {
	Object.defineProperty(nitroApp, '_betterAuth', {
		get: () => getter(),
	})
	nitroApp.hooks.hook('request', (event) => {
		Object.defineProperty(event.context, 'betterAuth', {
			get: () => getter(),
		})
	})

	let betterAuth: BetterAuthResult | undefined
	function getter(): BetterAuthResult | undefined {
		if (betterAuth == null) {
			const runtimeConfig = useRuntimeConfig()
			const options = resolveBetterAuthOptions(runtimeConfig)
			betterAuth = createBetterAuth(options)
		}
		return betterAuth
	}
})

declare module 'nitropack' {
	interface NitroApp {
		_betterAuth: BetterAuthResult | undefined
	}
}

declare module 'h3' {
	interface H3EventContext {
		betterAuth: BetterAuthResult | undefined
	}
}
