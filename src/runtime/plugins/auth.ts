import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import type { H3Event } from 'h3'
import process from 'node:process'
import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'
import { betterAuth as createBetterAuth } from 'better-auth'
import { getRequestHost, getRequestProtocol } from 'h3'
import { resolveBetterAuthOptions } from '../utils/base-url'

interface RuntimeConfig {
	nitroBetterAuth: {
		nitroBasePath: string
		handlerBasePath: string
		autoBaseURL: boolean
	}
	public?: {
		siteUrl?: unknown
	}
}

export default defineNitroPlugin((nitroApp) => {
	Object.defineProperty(nitroApp, '_betterAuth', {
		get: () => getter(),
	})
	nitroApp.hooks.hook('request', (event) => {
		Object.defineProperty(event.context, 'betterAuth', {
			get: () => getter(event),
		})
	})

	// shortcut: development app singleton keeps its first inferred origin, replace with per-origin caching in ticket 04.
	let betterAuth: BetterAuthResult | undefined
	function getter(event?: H3Event): BetterAuthResult {
		if (betterAuth == null) {
			const opts = loadServerOptions() || {}
			const runtimeConfig = useRuntimeConfig(event) as unknown as RuntimeConfig
			const moduleConfig = runtimeConfig.nitroBetterAuth
			const resolvedOptions = resolveBetterAuthOptions(opts, {
				dev: import.meta.dev === true,
				nitroBasePath: moduleConfig.nitroBasePath,
				handlerBasePath: moduleConfig.handlerBasePath,
				autoBaseURL: moduleConfig.autoBaseURL,
				siteURL: runtimeConfig.public?.siteUrl || process.env.NUXT_PUBLIC_SITE_URL,
				betterAuthURL: process.env.BETTER_AUTH_URL,
				requestOrigin: import.meta.dev === true ? getEventOrigin(event) : undefined,
				warn: warning => console.warn(warning),
			})
			betterAuth = createBetterAuth(resolvedOptions)
		}
		return betterAuth
	}
})

function getEventOrigin(event?: H3Event): string | undefined {
	if (!event)
		return undefined

	const host = getRequestHost(event, { xForwardedHost: true })
	const protocol = getRequestProtocol(event, { xForwardedProto: true })
	return host ? `${protocol}://${host}` : undefined
}

declare module 'nitropack' {
	interface NitroApp {
		_betterAuth: BetterAuthResult
	}
}

declare module 'h3' {
	interface H3EventContext {
		betterAuth: BetterAuthResult
	}
}
