import type { H3Event } from 'h3'
import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { betterAuth as createBetterAuth } from 'better-auth'
import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import { resolveBetterAuthOptions } from '../utils/better-auth-options'

export default defineNitroPlugin((nitroApp) => {
	const instances = new WeakMap<H3Event, BetterAuthResult>()
	nitroApp.hooks.hook('request', (event) => {
		Object.defineProperty(event.context, 'betterAuth', {
			get: () => {
				const instance = instances.get(event)
				if (instance)
					return instance

				const runtimeConfig = useRuntimeConfig()
				const options = resolveBetterAuthOptions(runtimeConfig, event)
				const betterAuth = createBetterAuth(options)
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
