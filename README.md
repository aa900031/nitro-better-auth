# nitro-better-auth

[![npm version](https://img.shields.io/npm/v/nitro-better-auth?style=flat&colorA=18181B&colorB=F0DB4F)](https://npmjs.com/package/nitro-better-auth)
[![npm downloads](https://img.shields.io/npm/dm/nitro-better-auth?style=flat&colorA=18181B&colorB=F0DB4F)](https://npmjs.com/package/nitro-better-auth)
[![coverage](https://img.shields.io/codecov/c/gh/aa900031/nitro-better-auth?logo=codecov&style=flat&colorA=18181B&colorB=F0DB4F)](https://codecov.io/gh/aa900031/nitro-better-auth)
![coderabbit](https://img.shields.io/coderabbit/prs/github/aa900031/nitro-better-auth?style=flat&logo=coderabbit&logoColor=FF570A&label=CodeRabbit%20Reviews&colorA=18181B&colorB=F0DB4F)

[![npm peer dependency version - better-auth](https://img.shields.io/npm/dependency-version/nitro-better-auth/peer/better-auth?style=flat&colorA=18181B&colorB=F0DB4F)](https://www.npmjs.com/package/better-auth)

## Features

- Flexable use better-auth
- Type safe

## Installation

Add dependencies to your project

```bash [pnpm]
pnpm add nitro-better-auth better-auth
```

```bash [npm]
npm install nitro-better-auth better-auth
```

Add module in your `nitro.config.ts`

```typescript [nitro.config.ts]
export default defineNitroConfig({
	modules: ['nitro-better-auth'],
	betterAuth: {
		mountPath: '/api/auth', // Optional; the module registers `/api/auth/**`.
	},
})
```

The former `handlerPath` option is deprecated. A static path ending in `/**`, such as `/api/auth/**`, is migrated to `mountPath: '/api/auth'` with a warning. Other route patterns and configurations that set both options fail at startup; update those configurations to use `mountPath`.

> [!TIP]
> When you are using Postgresql as database with Hyperdrive in Cloudflare Worker, you should setup server singleton by request.

```typescript [nitro.config.ts]
export default defineNitroConfig({
	modules: ['nuxt-better-auth'],
	// Setup server singleton by request
	betterAuth: {
		singleton: 'request',
	},
	// [Optional] Enable async context: https://nitro.build/guide/utils#async-context-experimental
	experimental: {
		asyncContext: true,
	},
})
```

## Usage

You can easily get betterAuth instance through `useBetterAuth` in the `eventHandler`.

```typescript
export default eventHandler(async () => {
	const betterAuth = useBetterAuth()

	// Do something with betterAuth
	// e.g: call login with anonymous
	const resp = await betterAuth.api.signInAnonymous()

	return {
		success: true,
		data: resp,
	}
})
```

If use singleton for request, please put `event` to `useBetterAuth`, or used `asyncContext` first then you don't need that anymore.

```typescript
export default eventHandler(async () => {
	const betterAuth = useBetterAuth(event)

	// Do something with betterAuth
	// e.g: call login with anonymous
	const resp = await betterAuth.api.signInAnonymous()

	return {
		success: true,
		data: resp,
	}
})
```

## Custom options

Create file at nitro's server dir (default is `server/`), e.g: `server/better-auth/server-options.ts`.

```typescript [server/better-auth/server-options.ts]
import { anonymous } from 'better-auth/plugins'
import { defineAuthOptions } from 'nitro-better-auth/config'

export default defineAuthOptions(({ basePath, baseURL }) => ({
	plugins: [
		anonymous(),
	],
}))
```

### Runtime options

Set module-managed options through Nitro's private runtime config:

```typescript [nitro.config.ts]
export default defineNitroConfig({
	runtimeConfig: {
		betterAuth: {
			baseURL: '', // Set NITRO_BETTER_AUTH_BASE_URL at runtime.
			basePath: '', // Set NITRO_BETTER_AUTH_BASE_PATH at runtime.
			secret: '', // Set NITRO_BETTER_AUTH_SECRET at runtime.
		},
	},
})
```

### Base URL resolution

The module infers an origin-only `baseURL` from `runtimeConfig.public.siteUrl` and common development and deployment environments. Explicit factory and runtime values are passed through. The first available source wins:

| Priority | Source | When used |
| --- | --- | --- |
| 1 | `defineAuthOptions` return value | Explicit Better Auth configuration. |
| 2 | `runtimeConfig.betterAuth.baseURL` | Per-deployment private runtime configuration. |
| 3 | `BETTER_AUTH_URL` | The module leaves `baseURL` unset; Better Auth reads this environment variable directly. |
| 4 | `runtimeConfig.public.siteUrl` | The configured public site origin. |
| 5 | Request origin | Development requests only. |
| 6 | Nitro listener origin | Development only, including Nuxt development proxy settings. |
| 7 | `VERCEL_URL` → `CF_PAGES_URL` → `URL` | Supported deployment platform environment variables. |
| 8 | `http://localhost:3000` | Development fallback only. |

For a dynamic Better Auth `baseURL` object without `fallback`, the resolved runtime or inferred URL becomes its fallback. In production, configure a canonical URL with `runtimeConfig.betterAuth.baseURL`, `runtimeConfig.public.siteUrl`, `BETTER_AUTH_URL`, or a supported platform variable; request-origin inference is development-only.

### Base path resolution

The first available source wins:

| Priority | Source | When used |
| --- | --- | --- |
| 1 | `defineAuthOptions` return value | Explicit Better Auth configuration. |
| 2 | `runtimeConfig.betterAuth.basePath` | Per-deployment private runtime configuration. |
| 3 | `joinURL(runtimeConfig.app.baseURL, betterAuth.mountPath)` | Default path. For example, `/api/auth` under `/shop/` becomes `/shop/api/auth`. |

Nitro registers the handler with the base-relative module `mountPath`. A resolved `basePath` that differs from the registered route emits a warning, whether it came from the factory or runtime config.

### Secret resolution

Never place a secret in `runtimeConfig.public`. The first available module source wins:

| Priority | Source | When used |
| --- | --- | --- |
| 1 | `defineAuthOptions` `secret` or `secrets` | Explicit Better Auth configuration. `secrets` supports versioned rotation. |
| 2 | `runtimeConfig.betterAuth.secret` | Per-deployment private runtime configuration. |
| 3 | Better Auth native environment handling | The module leaves the value unset, allowing Better Auth to read `BETTER_AUTH_SECRET`, `BETTER_AUTH_SECRETS`, or `AUTH_SECRET`. |

Use `secrets` in `defineAuthOptions` or `BETTER_AUTH_SECRETS` when rotating keys without invalidating decryptable data. The module does not inject `runtimeConfig.betterAuth.secret` when the factory provides either `secret` or `secrets`.

## Middlewares

Provide middleware for auth, you can easy use in `eventHandler`

```typescript
export default eventHandler({
	onRequest: [
		AuthenticateMiddleware, // a.k.a: AuthMiddleware
	],
	handler: async (event) => {
		// Could get auth data form event.context
		const { user } = event.context.auth!
		return {
			data: user,
		}
	},
})
```

## License

Made with ❤️

Published under the [MIT License](https://github.com/aa900031/nitro-better-auth/blob/main/LICENSE).
