import type { BetterAuthOptions } from 'better-auth'
import type { H3Event } from 'h3'
import type { ServerOptionsContext } from 'nitro-better-auth/config'
import type { NitroRuntimeConfig } from 'nitropack/types'
import { getRequestURL } from 'h3'
import { env } from 'std-env'
import { joinURL, withoutTrailingSlash } from 'ufo'
import serverOptionsContextConfig from '#nitro-better-auth/server-options-context.mjs'
import loadServerOptions from '#nitro-better-auth/server-options.mjs'
import { warnOnce } from './logger'

export interface ServerOptionsContextConfig {
	dev: boolean
	mountPath: string
}

export function resolveBetterAuthOptions<T extends BetterAuthOptions>(
	runtimeConfig: NitroRuntimeConfig,
	event: H3Event | undefined,
): T {
	const { basePath, registeredBasePath } = resolveBasePath(runtimeConfig)
	const { baseURL } = resolveBaseURL(runtimeConfig, event)
	const serverOptionsContext: ServerOptionsContext = {
		basePath,
		...(baseURL === undefined ? {} : { baseURL }),
	}
	const userOptions = loadServerOptions(serverOptionsContext)
	const options: BetterAuthOptions = { ...userOptions }
	if (options.basePath === undefined)
		options.basePath = serverOptionsContext.basePath
	if (options.baseURL === undefined && serverOptionsContext.baseURL !== undefined)
		options.baseURL = serverOptionsContext.baseURL
	else if (typeof options.baseURL === 'object' && options.baseURL.fallback === undefined && serverOptionsContext.baseURL !== undefined)
		options.baseURL = { ...options.baseURL, fallback: serverOptionsContext.baseURL }
	if (options.secret === undefined && options.secrets === undefined) {
		const secret = resolveRuntimeSecret(runtimeConfig)
		if (secret !== undefined)
			options.secret = secret
	}

	warnPathMismatch(registeredBasePath, options)
	return options as T
}

function resolveBasePath(
	runtimeConfig: NitroRuntimeConfig,
): { basePath: string, registeredBasePath: string } {
	const registeredBasePath = joinURL(runtimeConfig.app.baseURL, serverOptionsContextConfig.mountPath)
	const basePath = runtimeConfig.betterAuth?.basePath
	return {
		basePath: typeof basePath === 'string' && basePath
			? basePath
			: registeredBasePath,
		registeredBasePath,
	}
}

export type BaseURLSource
	/** `runtimeConfig.betterAuth.baseURL` */
	= | 'runtime-config'
		/** The `BETTER_AUTH_URL` environment variable, read by better-auth itself. */
		| 'better-auth-env'
		/** `runtimeConfig.public.siteUrl` */
		| 'site-url'
		/** The origin of the current request (development only). */
		| 'request-origin'
		/** The Nitro listener origin, including the Nuxt development proxy (development only). */
		| 'nitro-origin'
		/** The `VERCEL_URL` environment variable. */
		| 'vercel-env'
		/** The `CF_PAGES_URL` environment variable. */
		| 'cf-pages-env'
		/** The `URL` environment variable. */
		| 'url-env'
		/** `http://localhost:3000` (development only). */
		| 'dev-fallback'
		/** Nothing is available; better-auth receives no baseURL. */
		| 'none'

export interface ResolvedBaseURL {
	baseURL: string | undefined
	source: BaseURLSource
}

/** True when the source is inferred from the surroundings rather than explicitly configured. */
export function isInferredSource(source: BaseURLSource): boolean {
	switch (source) {
		case 'runtime-config':
		case 'better-auth-env':
		case 'site-url':
			return false
		default:
			return true
	}
}

export function resolveBaseURL(
	runtimeConfig: NitroRuntimeConfig,
	event?: H3Event,
): ResolvedBaseURL {
	const dev = serverOptionsContextConfig.dev

	const baseURL = runtimeConfig.betterAuth?.baseURL
	if (typeof baseURL === 'string' && baseURL)
		return { baseURL, source: 'runtime-config' }

	if (env.BETTER_AUTH_URL)
		return { baseURL: undefined, source: 'better-auth-env' }

	const siteUrl = runtimeConfig.public?.siteUrl
	if (typeof siteUrl === 'string') {
		const configuredOrigin = validateURL(siteUrl, dev)
		if (configuredOrigin !== undefined)
			return { baseURL: configuredOrigin, source: 'site-url' }
	}

	if (dev && event !== undefined) {
		try {
			const requestOrigin = getRequestURL(event, {
				xForwardedHost: true,
				xForwardedProto: true,
			}).origin
			return { baseURL: validateURL(requestOrigin, dev), source: 'request-origin' }
		}
		catch {}
	}

	const nitroOrigin = dev ? getNitroOrigin() : undefined
	if (nitroOrigin) {
		const baseURL = validateURL(nitroOrigin, dev)
		if (baseURL)
			return { baseURL, source: 'nitro-origin' }
	}
	if (env.VERCEL_URL) {
		const baseURL = validateURL(`https://${env.VERCEL_URL}`, dev)
		if (baseURL) {
			return { baseURL, source: 'vercel-env' }
		}
	}
	if (env.CF_PAGES_URL) {
		const baseURL = validateURL(env.CF_PAGES_URL, dev)
		if (baseURL)
			return { baseURL, source: 'cf-pages-env' }
	}
	if (env.URL) {
		const baseURL = validateURL(env.URL.startsWith('http') ? env.URL : `https://${env.URL}`, dev)
		if (baseURL)
			return { baseURL, source: 'url-env' }
	}

	if (dev)
		return { baseURL: 'http://localhost:3000', source: 'dev-fallback' }

	return { baseURL: undefined, source: 'none' }
}

/** Adapted from nuxt-site-config via @nuxtjs/better-auth. */
function getNitroOrigin(): string | undefined {
	const cert = env.NITRO_SSL_CERT
	const key = env.NITRO_SSL_KEY
	let host = env.NITRO_HOST || env.HOST
	let port = env.NITRO_PORT || env.PORT
	if (host === undefined && port === undefined)
		return undefined
	const protocol = cert && key ? 'https' : 'http'

	try {
		if (env.__NUXT_DEV__) {
			const url = new URL(JSON.parse(env.__NUXT_DEV__).proxy.url)
			if (url.protocol === 'http:' || url.protocol === 'https:')
				return url.origin
		}
		else if (env.NUXT_VITE_NODE_OPTIONS) {
			const url = new URL(JSON.parse(env.NUXT_VITE_NODE_OPTIONS).baseURL)
			if (url.protocol === 'http:' || url.protocol === 'https:')
				return url.origin
		}
	}
	catch {}

	host ||= 'localhost'
	port ||= '3000'

	if (!host.startsWith('[') && host.indexOf(':') !== host.lastIndexOf(':'))
		host = `[${host}]`

	const hasExplicitPort = host.startsWith('[') ? host.includes(']:') : host.includes(':')
	return `${protocol}://${host}${!hasExplicitPort && port ? `:${port}` : ''}`
}

/** Adapted from `@nuxtjs/better-auth`  */
function validateURL(value: string, dev: boolean): string | undefined {
	try {
		const firstCode = value.charCodeAt(0)
		if (firstCode <= 32 || firstCode === 127)
			return
		const url = new URL(value)
		if (url.protocol !== 'http:' && url.protocol !== 'https:')
			return
		const hasUserinfo = /^https?:[/\\]*[^/\\?#]*@/i.test(value.trim().replace(/[\t\n\r]/g, ''))
		if (url.username || url.password || hasUserinfo)
			return
		if (dev && (url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === '[::1]'))
			url.hostname = 'localhost'
		return url.origin
	}
	catch {}
}

function warnPathMismatch(
	basePath: string,
	options?: BetterAuthOptions,
): void {
	warnPath(basePath, options?.basePath, 'basePath')
	const baseURL = typeof options?.baseURL === 'string' ? options.baseURL : options?.baseURL?.fallback
	warnURLPath(basePath, baseURL, 'baseURL')
	warnURLPath(basePath, env.BETTER_AUTH_URL, 'BETTER_AUTH_URL')
}

function warnPath(
	registeredPath: string,
	path: string | undefined,
	source: string,
): void {
	if (path !== undefined && withoutTrailingSlash(path) !== withoutTrailingSlash(registeredPath)) {
		warnOnce(
			`${source} path "${path}" does not match the registered route "${registeredPath}".`,
		)
	}
}

function warnURLPath(
	registeredPath: string,
	value: string | undefined,
	source: string,
): void {
	if (value === undefined)
		return
	try {
		const path = new URL(value).pathname
		if (path !== '/')
			warnPath(registeredPath, path, source)
	}
	catch {}
}

function resolveRuntimeSecret(
	runtimeConfig: NitroRuntimeConfig,
): string | undefined {
	const secret = runtimeConfig.betterAuth?.secret
	return typeof secret === 'string' && secret ? secret : undefined
}
