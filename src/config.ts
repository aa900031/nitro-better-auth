import type { BetterAuthOptions } from 'better-auth'

export interface ServerOptionsContext {
	basePath: string
	baseURL?: string
}

export type AuthOptionsFactory<T extends BetterAuthOptions | undefined = BetterAuthOptions | undefined>
	= (context: ServerOptionsContext) => T

export function defineAuthOptions<const T extends BetterAuthOptions | undefined>(
	factory: AuthOptionsFactory<T>,
): AuthOptionsFactory<T> {
	return factory
}
