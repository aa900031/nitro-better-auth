import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import type { H3Event } from 'h3'

export function useBetterAuth(
	event: H3Event,
): BetterAuthResult {
	if (event == null)
		throw new Error('Please put event from eventHandler at first argument')

	if (event.context.betterAuth == null)
		throw new Error('No better-auth provide from event.context')

	return event.context.betterAuth
}
