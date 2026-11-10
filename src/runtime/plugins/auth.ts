import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { defineNitroPlugin } from '#imports'
import { getBetterAuth } from '../utils/better-auth-manager'

export default defineNitroPlugin((nitroApp) => {
	nitroApp.hooks.hook('request', (event) => {
		if ('betterAuth' in event.context)
			return

		let instance: BetterAuthResult | undefined
		Object.defineProperty(event.context, 'betterAuth', {
			get: () => instance ??= getBetterAuth(event),
		})
	})
})

declare module 'h3' {
	interface H3EventContext {
		betterAuth: BetterAuthResult | undefined
	}
}
