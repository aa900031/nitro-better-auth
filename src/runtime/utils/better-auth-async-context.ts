import type { H3Event } from 'h3'
import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { useEvent } from '#imports'
import { getBetterAuth } from './better-auth-manager'

export function useBetterAuth(
	event?: H3Event,
): BetterAuthResult {
	event ??= tryUseEvent()
	return event?.context.betterAuth ?? getBetterAuth(event)
}

function tryUseEvent(): H3Event | undefined {
	try {
		return useEvent()
	}
	catch {
		return undefined
	}
}
