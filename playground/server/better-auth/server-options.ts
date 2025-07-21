import type { BetterAuthOptions } from 'better-auth'
import { anonymous } from 'better-auth/plugins'

export default () => ({
	plugins: [
		anonymous(),
	],
} satisfies BetterAuthOptions)
