import type { BetterAuthOptions } from 'better-auth'
import type { H3Event } from 'h3'
import { getRequestHost, getRequestProtocol } from 'h3'
import { resolveBetterAuthOptions } from './better-auth-options'
import { getDevelopmentTrustedOrigins, resolveRuntimeOrigin } from './runtime-origin'
import { withDevTrustedOrigins } from './trusted-origins'

export interface BetterAuthRuntimeConfig {
	nitroBetterAuth: {
		nitroBasePath: string
		handlerBasePath: string
		autoBaseURL: boolean
	}
	public?: {
		siteUrl?: unknown
	}
}

export function resolveRuntimeBetterAuthOptions<T extends object>(
	options: T,
	params: {
		dev: boolean
		env: Record<string, string | undefined>
		event?: H3Event
		runtimeConfig: BetterAuthRuntimeConfig
		onInferred?: (baseURL: string, source: string) => void
		warn?: (message: string) => void
	},
): { options: T, cacheKey?: string } {
	let cacheKey: string | undefined
	const moduleConfig = params.runtimeConfig.nitroBetterAuth
	let resolvedOptions = resolveBetterAuthOptions(options, {
		dev: params.dev,
		nitroBasePath: moduleConfig.nitroBasePath,
		handlerBasePath: moduleConfig.handlerBasePath,
		autoBaseURL: moduleConfig.autoBaseURL,
		siteURL: params.runtimeConfig.public?.siteUrl || params.env.NUXT_PUBLIC_SITE_URL,
		betterAuthURL: params.env.BETTER_AUTH_URL,
		requestOrigin: params.dev ? getEventOrigin(params.event) : undefined,
		getEnvironmentOrigin: () => resolveRuntimeOrigin({
			dev: params.dev,
			env: params.env,
		}),
		onInferred: (baseURL, source) => {
			params.onInferred?.(baseURL, source)
			if (source === 'request origin')
				cacheKey = baseURL
		},
		warn: params.warn,
	})
	const configured = resolvedOptions as { trustedOrigins?: BetterAuthOptions['trustedOrigins'] }
	const trustedOrigins = withDevTrustedOrigins(configured.trustedOrigins, {
		dev: params.dev,
		autoBaseURL: moduleConfig.autoBaseURL,
		devOrigins: params.dev && moduleConfig.autoBaseURL
			? getDevelopmentTrustedOrigins(params.env)
			: [],
	})
	if (trustedOrigins !== configured.trustedOrigins) {
		resolvedOptions = {
			...resolvedOptions,
			trustedOrigins,
		}
	}

	return { options: resolvedOptions, cacheKey }
}

function getEventOrigin(event?: H3Event): string | undefined {
	if (!event)
		return undefined

	const host = getRequestHost(event, { xForwardedHost: true })
	const protocol = getRequestProtocol(event, { xForwardedProto: true })
	return host ? `${protocol}://${host}` : undefined
}
