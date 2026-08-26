import type { H3Event } from 'h3'
import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { useEvent } from '#imports'

export function useBetterAuth(
	event: H3Event = useEvent(),
): BetterAuthResult {
	if (event.context.betterAuth == null)
		throw new Error('No better-auth provide from event.context')

	return event.context.betterAuth
}
