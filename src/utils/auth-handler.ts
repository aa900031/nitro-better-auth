import type { Nitro } from 'nitropack'
import type { ResolvedMoudleOptions } from '..'
import type { Resolver } from './nitro'
import { joinURL } from 'ufo'
import { addHandler } from './nitro'

export function addAuthHandler(
	nitro: Nitro,
	resolver: Resolver,
	options: ResolvedMoudleOptions,
): void {
	const routePath = joinURL(options.mountPath, '**')

	addHandler(nitro, {
		route: routePath,
		handler: resolver.resolve('./runtime/api/auth'),
	})
}
