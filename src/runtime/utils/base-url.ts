export interface ServerBaseURLContext {
	dev: boolean
	nitroBasePath: string
	handlerBasePath: string
	siteURL?: unknown
	betterAuthURL?: string
	requestOrigin?: string
}

export function validateSiteURL(value: string): string {
	return validateHTTPURL(value, 'Invalid siteUrl. Must be a valid HTTP(S) URL without credentials.').origin
}

export function resolveHandlerBasePath(handlerPath: string): string | undefined {
	if (!handlerPath.startsWith('/'))
		return undefined

	const path = handlerPath.endsWith('/**')
		? handlerPath.slice(0, -3)
		: handlerPath

	if (!path || /[*:?]/.test(path))
		return undefined

	return `/${path.split('/').filter(Boolean).join('/')}`
}

export function resolveAuthBaseURL(
	siteURL: string,
	nitroBasePath: string,
	handlerBasePath: string,
): string {
	const origin = validateSiteURL(siteURL)
	if (normalizePath(nitroBasePath) === '/' && normalizePath(handlerBasePath) === '/api/auth')
		return origin

	return `${origin}${joinPath(nitroBasePath, handlerBasePath)}`
}

export function resolveServerBaseURL(context: ServerBaseURLContext): string {
	if (context.siteURL != null && context.siteURL !== '') {
		if (typeof context.siteURL !== 'string')
			throw new Error('Invalid siteUrl. Must be a valid HTTP(S) URL without credentials.')

		return resolveAuthBaseURL(
			validateSiteURL(context.siteURL),
			context.nitroBasePath,
			requireHandlerBasePath(context.handlerBasePath),
		)
	}

	if (context.betterAuthURL) {
		return normalizeEndpointURL(context.betterAuthURL)
	}

	if (context.dev && context.requestOrigin) {
		try {
			return resolveAuthBaseURL(
				validateSiteURL(context.requestOrigin),
				context.nitroBasePath,
				requireHandlerBasePath(context.handlerBasePath),
			)
		}
		catch {
			// Request headers are untrusted; an invalid inferred origin falls through.
		}
	}

	if (context.dev) {
		return resolveAuthBaseURL(
			'http://localhost:3000',
			context.nitroBasePath,
			requireHandlerBasePath(context.handlerBasePath),
		)
	}

	throw new Error(
		'[nitro-better-auth] siteUrl required in production. '
		+ 'Set NUXT_PUBLIC_SITE_URL to your public application URL, '
		+ 'set BETTER_AUTH_URL, or provide a supported deployment platform URL.',
	)
}

export function resolveBetterAuthOptions<T extends object>(
	options: T,
	context: ServerBaseURLContext,
): T & { baseURL: string } {
	if ((options as { baseURL?: unknown }).baseURL)
		return options as T & { baseURL: string }

	return {
		...options,
		baseURL: resolveServerBaseURL(context),
	}
}

function normalizeEndpointURL(value: string): string {
	const url = validateHTTPURL(
		value,
		'Invalid BETTER_AUTH_URL. Must be a valid HTTP(S) URL without credentials.',
	)
	return url.href.endsWith('/') ? url.href.slice(0, -1) : url.href
}

function requireHandlerBasePath(path: string): string {
	if (!path) {
		throw new Error(
			'[nitro-better-auth] Cannot infer an auth endpoint from handlerPath. '
			+ 'Use a static path with an optional trailing /** glob.',
		)
	}
	return path
}

function validateHTTPURL(value: string, message: string): URL {
	try {
		const firstCode = value.charCodeAt(0)
		if (firstCode <= 32 || firstCode === 127)
			throw new Error('leading whitespace or control character')

		const url = new URL(value)
		if (url.protocol !== 'http:' && url.protocol !== 'https:')
			throw new Error('unsupported protocol')

		const hasUserinfo = /^https?:[/\\]*[^/\\?#]*@/i.test(
			value.trim().replace(/[\t\n\r]/g, ''),
		)
		if (url.username || url.password || hasUserinfo)
			throw new Error('credentials are not allowed')

		return url
	}
	catch {
		throw new Error(message)
	}
}

function joinPath(...paths: string[]): string {
	return `/${paths.flatMap(path => path.split('/')).filter(Boolean).join('/')}`
}

function normalizePath(path: string): string {
	return joinPath(path)
}
