# nitro-better-auth

[![npm version](https://img.shields.io/npm/v/nitro-better-auth?style=flat&colorA=18181B&colorB=F0DB4F)](https://npmjs.com/package/nitro-better-auth)
[![npm downloads](https://img.shields.io/npm/dm/nitro-better-auth?style=flat&colorA=18181B&colorB=F0DB4F)](https://npmjs.com/package/nitro-better-auth)
[![coverage](https://img.shields.io/codecov/c/gh/aa900031/nitro-better-auth?logo=codecov&style=flat&colorA=18181B&colorB=F0DB4F)](https://codecov.io/gh/aa900031/nitro-better-auth)
![coderabbit](https://img.shields.io/coderabbit/prs/github/aa900031/nitro-better-auth?style=flat&logo=coderabbit&logoColor=FF570A&label=CodeRabbit%20Reviews&colorA=18181B&colorB=F0DB4F)

[![npm peer dependency version - better-auth](https://img.shields.io/npm/dependency-version/nitro-better-auth/peer/better-auth?style=flat&colorA=18181B&colorB=F0DB4F)](https://www.npmjs.com/package/better-auth)

# Features

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
		// [Optional]
	},
})
```

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
import type { BetterAuthOptions } from 'better-auth'
import { anonymous } from 'better-auth/plugins'

export default () => ({
	plugins: [
		anonymous(),
	],
} satisfies BetterAuthOptions)
```

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
