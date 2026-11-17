import type { H3Event } from 'h3'
import type { NitroRuntimeConfig } from 'nitropack/types'
import type { BetterAuthResult } from '#nitro-better-auth/types/server-options'
import { betterAuth as createBetterAuth } from 'better-auth'
import { env } from 'std-env'
import { useNitroApp, useRuntimeConfig } from '#imports'
import serverOptionsContextConfig from '#nitro-better-auth/server-options-context.mjs'
import { isInferredSource, resolveBaseURL, resolveBetterAuthOptions } from './better-auth-options'
import { warnOnce } from './logger'

export function getBetterAuth(event?: H3Event): BetterAuthResult {
	const nitroApp = useNitroApp()
	const runtimeConfig = useRuntimeConfig(event)
	const betterAuth = nitroApp._betterAuth ??= new BetterAuthManager()
	return betterAuth.get(runtimeConfig, event)
}

class BetterAuthManager {
	private '~instances' = new Map<string | null, BetterAuthResult>()

	public get(
		runtimeConfig: NitroRuntimeConfig,
		event: H3Event | undefined,
	): BetterAuthResult {
		const key = resolveInstanceKey(runtimeConfig, event)
		let instance = this['~instances'].get(key)
		if (instance == null) {
			const options = resolveBetterAuthOptions(runtimeConfig, event)
			instance = createBetterAuth(options)
			this['~instances'].set(key, instance)
		}
		return instance
	}
}

function resolveInstanceKey(
	runtimeConfig: NitroRuntimeConfig,
	event: H3Event | undefined,
): string | null {
	const { baseURL, source } = resolveBaseURL(runtimeConfig, event)
	if (source === 'better-auth-env')
		return env.BETTER_AUTH_URL ?? null

	if (serverOptionsContextConfig.dev && event === undefined && isInferredSource(source)) {
		warnOnce(
			`useBetterAuth was called without an event and no baseURL is configured; falling back to "${baseURL}". Pass the event inside request handlers, or configure a baseURL for deterministic URLs.`,
		)
	}

	return baseURL ?? null
}

declare module 'nitropack' {
	interface NitroApp {
		_betterAuth?: BetterAuthManager
	}
}
