import type { Auth, BetterAuthOptions } from 'better-auth'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'
import { betterAuth } from 'better-auth'
import { defu } from 'defu'

export function createBetterAuth(
	event?: H3Event,
): Auth<any> {
	const runtimeConfig = useRuntimeConfig(event)
	const userOptions = loadServerOptions()
	const masureOptions = {
		baseURL: runtimeConfig.betterAuth?.url // NITRO_BETTER_AUTH_URL
			?? runtimeConfig.public?.betterAuth?.url // NITRO_PUBLIC_BETTER_AUTH_URL
			?? runtimeConfig.betterAuth?.baseUrl // NITRO_BETTER_AUTH_BASE_URL
			?? runtimeConfig.public?.betterAuth?.baseUrl // NITRO_PUBLIC_BETTER_AUTH_BASE_URL
			?? runtimeConfig.auth?.url // NITRO_AUTH_URL
			?? runtimeConfig.public?.auth?.url, // NITRO_PUBLIC_AUTH_URL
	} satisfies BetterAuthOptions

	return betterAuth(
		defu(userOptions, masureOptions),
	)
}
