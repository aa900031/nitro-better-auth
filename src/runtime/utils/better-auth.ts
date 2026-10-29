import type { H3Event } from 'h3'
import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { useNitroApp } from '#imports'

export function useBetterAuth(event?: H3Event): BetterAuthResult {
	if (event?.context.betterAuth)
		return event.context.betterAuth

	const nitroApp = useNitroApp()
	if (nitroApp._betterAuth == null)
		throw new Error('No better-auth provide from nitro app')

	return nitroApp._betterAuth
}
