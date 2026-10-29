import type { BetterAuthOptions } from 'better-auth'

export function withDevTrustedOrigins(
	trustedOrigins: BetterAuthOptions['trustedOrigins'],
	params: {
		dev: boolean
		autoBaseURL: boolean
		devOrigins: string[]
	},
): BetterAuthOptions['trustedOrigins'] {
	if (!params.dev || !params.autoBaseURL)
		return trustedOrigins

	const merge = (
		origins: readonly (string | null | undefined)[],
		request?: Request,
	): string[] => {
		const valid = origins.filter(
			(origin): origin is string => typeof origin === 'string' && origin.trim().length > 0,
		)
		const requestOrigin = getRequestOrigin(request)
		return [...new Set([
			...valid,
			...params.devOrigins,
			...requestOrigin ? [requestOrigin] : [],
		])]
	}

	if (typeof trustedOrigins === 'function') {
		return async (request?: Request) => {
			return merge(await trustedOrigins(request), request)
		}
	}

	const configuredOrigins = Array.isArray(trustedOrigins) ? trustedOrigins : []
	return async (request?: Request) => merge(configuredOrigins, request)
}

function getRequestOrigin(request?: Request): string | undefined {
	if (!request)
		return undefined
	try {
		return new URL(request.url).origin
	}
	catch {
		return undefined
	}
}
