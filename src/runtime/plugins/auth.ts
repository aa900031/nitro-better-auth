import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { defineNitroPlugin } from '#imports'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'
import { betterAuth as createBetterAuth } from 'better-auth'
import { defu } from 'defu'

export default defineNitroPlugin((nitroApp) => {
	let betterAuth: BetterAuthResult | undefined
	Object.defineProperty(nitroApp, '_betterAuth', {
		get: () => {
			if (betterAuth == null) {
				const opts = loadServerOptions()
				betterAuth = createBetterAuth(
					defu(opts, {}),
				)
			}
			return betterAuth
		},
	})
})

declare module 'nitropack' {
	interface NitroApp {
		_betterAuth: BetterAuthResult | undefined
	}
}
