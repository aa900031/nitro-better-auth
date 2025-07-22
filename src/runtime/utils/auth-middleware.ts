import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { createError, eventHandler, useBetterAuth } from '#imports'

export const AuthMiddleware = eventHandler(async (event) => {
	const auth = useBetterAuth(event)

	const session = await auth.api.getSession({
		headers: event.headers,
	})
	if (!session) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized',
		})
	}

	event.context.auth = session
})

export type AuthSession = NonNullable<Awaited<ReturnType<BetterAuthResult['api']['getSession']>>>

declare module 'h3' {
	interface H3EventContext {
		auth: AuthSession | undefined
	}
}
