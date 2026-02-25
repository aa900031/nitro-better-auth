import type { Auth, BetterAuthOptions } from 'better-auth'
import { useRuntimeConfig } from '#imports'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'
import { betterAuth } from 'better-auth'
import { defu } from 'defu'

export function createBetterAuth(): Auth<any> {
	const runtimeConfig = useRuntimeConfig()
	const userOptions = loadServerOptions()
	const masureOptions = {
		baseURL: runtimeConfig.betterAuth?.url
			?? runtimeConfig.public.betterAuth?.url // NUXT_PUBLIC_BETTER_AUTH_URL
			?? runtimeConfig.betterAuth?.baseUrl
			?? runtimeConfig.public.betterAuth?.baseUrl
			?? runtimeConfig.public.auth?.url, // NUXT_PUBLIC_AUTH_URL
	} satisfies BetterAuthOptions

	return betterAuth(
		defu(userOptions, masureOptions),
	)
}
