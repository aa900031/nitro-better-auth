import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { defineNitroPlugin } from '#imports'
import { createBetterAuth } from '../utils/_instance'

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
			betterAuth = createBetterAuth()
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
