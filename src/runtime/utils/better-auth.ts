import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { useNitroApp } from '#imports'

export function useBetterAuth(): BetterAuthResult {
	const nitroApp = useNitroApp()
	if (nitroApp._betterAuth == null)
		throw new Error('No better-auth provide from context')

	return nitroApp._betterAuth
}
