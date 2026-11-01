import { anonymous } from 'better-auth/plugins'
import { defineAuthOptions } from 'nitro-better-auth/config'

export default defineAuthOptions(() => ({
	plugins: [
		anonymous(),
	],
}))
