import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { defineNitroPlugin } from '#imports'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'
import { betterAuth as createBetterAuth } from 'better-auth'
import { defu } from 'defu'

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
			const opts = loadServerOptions()
			betterAuth = createBetterAuth(
				defu(opts, {}),
			)
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
