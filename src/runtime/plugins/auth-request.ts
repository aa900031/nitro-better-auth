import type { H3Event } from 'h3'
import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { betterAuth as createBetterAuth } from 'better-auth'
import { defu } from 'defu'
import { defineNitroPlugin } from '#imports'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'

export default defineNitroPlugin((nitroApp) => {
	const instances = new WeakMap<H3Event, BetterAuthResult>()
	nitroApp.hooks.hook('request', (event) => {
		Object.defineProperty(event.context, 'betterAuth', {
			get: () => {
				const instance = instances.get(event)
				if (instance)
					return instance

				const opts = loadServerOptions()
				const betterAuth = createBetterAuth(
					defu(opts, {}),
				)
				instances.set(event, betterAuth)

				return betterAuth
			},
		})
	})
})

declare module 'h3' {
	interface H3EventContext {
		betterAuth: BetterAuthResult | undefined
	}
}
