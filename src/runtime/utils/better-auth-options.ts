import type { ServerBaseURLContext } from './base-url'
import { joinPath, normalizePath, resolveServerBaseURL } from './base-url'

export function resolveBetterAuthOptions<T extends object>(
	options: T,
	context: ServerBaseURLContext,
): T {
	if (context.autoBaseURL === false)
		return options

	const configured = options as {
		baseURL?: unknown
		basePath?: unknown
	}
	const mountedAuthPath = context.handlerBasePath
		? joinPath(context.nitroBasePath, context.handlerBasePath)
		: undefined

	if (
		context.dev
		&& typeof configured.basePath === 'string'
		&& mountedAuthPath
		&& normalizePath(configured.basePath) !== mountedAuthPath
	) {
		context.warn?.(
			`[nitro-better-auth] Better Auth basePath "${configured.basePath}" does not match the mounted auth path "${mountedAuthPath}".`,
		)
	}

	if (configured.baseURL != null) {
		if (configured.basePath != null || !mountedAuthPath || mountedAuthPath === '/api/auth')
			return options

		if (typeof configured.baseURL !== 'string' || !hasPathname(configured.baseURL))
			return { ...options, basePath: mountedAuthPath }

		return options
	}

	return {
		...options,
		baseURL: resolveServerBaseURL(context),
	}
}

function hasPathname(value: string): boolean {
	try {
		return new URL(value).pathname !== '/'
	}
	catch {
		return true
	}
}
