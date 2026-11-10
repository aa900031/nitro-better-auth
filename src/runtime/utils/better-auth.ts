import type { H3Event } from 'h3'
import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { getBetterAuth } from './better-auth-manager'

export function useBetterAuth(
	event?: H3Event,
): BetterAuthResult {
	return event?.context.betterAuth ?? getBetterAuth(event)
}
