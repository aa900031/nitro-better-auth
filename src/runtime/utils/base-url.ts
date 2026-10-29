export interface ServerBaseURLContext {
	dev: boolean
	nitroBasePath: string
	handlerBasePath: string
	autoBaseURL?: boolean
	siteURL?: unknown
	betterAuthURL?: string
	requestOrigin?: string
	environmentOrigin?: {
		origin: string
		source: string
	}
	getEnvironmentOrigin?: () => { origin: string, source: string } | undefined
	onInferred?: (baseURL: string, source: string) => void
	warn?: (message: string) => void
}

export function validateSiteURL(value: string): string {
	return validateHTTPURL(value, 'Invalid siteUrl. Must be a valid HTTP(S) URL without credentials.').origin
}

export function normalizeLoopbackOrigin(origin: string): string {
	const url = new URL(origin)
	if (url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === '::1')
		url.hostname = 'localhost'
	return url.origin
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
			const baseURL = resolveAuthBaseURL(
				normalizeLoopbackOrigin(validateSiteURL(context.requestOrigin)),
				context.nitroBasePath,
				requireHandlerBasePath(context.handlerBasePath),
			)
			context.onInferred?.(baseURL, 'request origin')
			return baseURL
		}
		catch {
			// Request headers are untrusted; an invalid inferred origin falls through.
		}
	}

	const environmentOrigin = context.environmentOrigin || context.getEnvironmentOrigin?.()
	if (environmentOrigin) {
		const baseURL = resolveAuthBaseURL(
			validateSiteURL(environmentOrigin.origin),
			context.nitroBasePath,
			requireHandlerBasePath(context.handlerBasePath),
		)
		if (context.dev)
			context.onInferred?.(baseURL, environmentOrigin.source)
		return baseURL
	}

	if (context.dev) {
		const baseURL = resolveAuthBaseURL(
			'http://localhost:3000',
			context.nitroBasePath,
			requireHandlerBasePath(context.handlerBasePath),
		)
		context.onInferred?.(baseURL, 'development fallback')
		return baseURL
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
		if (
			typeof configured.baseURL !== 'string'
			|| configured.basePath != null
			|| !mountedAuthPath
			|| mountedAuthPath === '/api/auth'
			|| hasPathname(configured.baseURL)
		) {
			return options
		}

		return {
			...options,
			basePath: mountedAuthPath,
		}
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
