import { normalizeLoopbackOrigin, validateSiteURL } from './base-url'

export interface RuntimeOrigin {
	origin: string
	source: string
}

export function resolveRuntimeOrigin({
	dev,
	env,
}: {
	dev: boolean
	env: Record<string, string | undefined>
}): RuntimeOrigin | undefined {
	if (dev) {
		const developmentOrigin = resolveDevelopmentOrigin(env)
		if (developmentOrigin)
			return developmentOrigin
	}

	if (env.VERCEL_URL) {
		return {
			origin: validateEnvironmentURL(withHTTPS(env.VERCEL_URL), 'VERCEL_URL'),
			source: 'VERCEL_URL',
		}
	}
	if (env.CF_PAGES_URL) {
		return {
			origin: validateEnvironmentURL(env.CF_PAGES_URL, 'CF_PAGES_URL'),
			source: 'CF_PAGES_URL',
		}
	}
	if (env.URL) {
		return {
			origin: validateEnvironmentURL(withHTTPS(env.URL), 'URL'),
			source: 'URL',
		}
	}

	return undefined
}

export function getDevelopmentTrustedOrigins(
	env: Record<string, string | undefined>,
): string[] {
	const developmentOrigin = resolveDevelopmentOrigin(env)
	if (!developmentOrigin)
		return ['http://localhost:3000']

	const url = new URL(developmentOrigin.origin)
	const localhostOrigin = `${url.protocol}//localhost${url.port ? `:${url.port}` : ''}`
	return [...new Set([localhostOrigin, url.origin])]
}

export function createInferredBaseURLWarning(
	warn: (message: string) => void,
): (baseURL: string, source: string) => void {
	let logged = false
	return (baseURL, source) => {
		if (logged)
			return
		logged = true
		warn(
			`[nitro-better-auth] Using inferred baseURL "${baseURL}" from ${source}. Set NUXT_PUBLIC_SITE_URL for deterministic OAuth callbacks.`,
		)
	}
}

function resolveDevelopmentOrigin(
	env: Record<string, string | undefined>,
): RuntimeOrigin | undefined {
	const proxyOrigin = readDevelopmentURL(env.__NUXT_DEV__, value => value?.proxy?.url)
	if (proxyOrigin) {
		return {
			origin: proxyOrigin,
			source: 'Nuxt development proxy',
		}
	}

	const viteOrigin = readDevelopmentURL(env.NUXT_VITE_NODE_OPTIONS, value => value?.baseURL)
	if (viteOrigin) {
		return {
			origin: viteOrigin,
			source: 'Nuxt Vite development URL',
		}
	}

	const listenerOrigin = resolveNitroListenerOrigin(env)
	return listenerOrigin
		? { origin: listenerOrigin, source: 'Nitro development environment' }
		: undefined
}

function readDevelopmentURL(
	raw: string | undefined,
	select: (value: any) => unknown,
): string | undefined {
	if (!raw)
		return undefined

	try {
		const value = select(JSON.parse(raw))
		return typeof value === 'string'
			? normalizeLoopbackOrigin(validateSiteURL(value))
			: undefined
	}
	catch {
		return undefined
	}
}

function resolveNitroListenerOrigin(
	env: Record<string, string | undefined>,
): string | undefined {
	let host = env.NITRO_HOST || env.HOST
	if (!host)
		return undefined
	if (host === '0.0.0.0' || host === '::' || host === '[::]')
		host = 'localhost'

	const protocol = env.NITRO_SSL_CERT && env.NITRO_SSL_KEY ? 'https' : 'http'
	const port = env.NITRO_PORT || env.PORT || '3000'
	if (!host.startsWith('[') && host.indexOf(':') !== host.lastIndexOf(':'))
		host = `[${host}]`

	const hasPort = host.startsWith('[') ? host.includes(']:') : host.includes(':')
	const portSuffix = hasPort ? '' : `:${port}`
	try {
		return normalizeLoopbackOrigin(validateSiteURL(`${protocol}://${host}${portSuffix}`))
	}
	catch {
		return undefined
	}
}

function validateEnvironmentURL(value: string, source: string): string {
	try {
		return normalizeLoopbackOrigin(validateSiteURL(value))
	}
	catch {
		throw new Error(
			`[nitro-better-auth] Invalid ${source}. Must be a valid HTTP(S) URL without credentials.`,
		)
	}
}

function withHTTPS(value: string): string {
	return /^https?:\/\//i.test(value) ? value : `https://${value}`
}
