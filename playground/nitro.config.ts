import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
	srcDir: 'server',
	modules: [
		'nitro-better-auth',
	],
	compatibilityDate: '2025-07-21',
})
