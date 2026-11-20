import { inspect } from 'node:util'
import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = defineDiagnostics({
	// Thrown errors only print `why`; the reporter is what surfaces `fix` to the user.
	reporters: [createConsoleReporter({ method: 'error' })],
	codes: {
		NITRO_BETTER_AUTH_C0001: {
			why: (p: { mountPath: unknown, handlerPath: unknown }) => `Both \`mountPath\` (${inspect(p.mountPath)}) and the deprecated \`handlerPath\` (${inspect(p.handlerPath)}) are configured.`,
			fix: 'Remove `handlerPath`.',
		},
		NITRO_BETTER_AUTH_C0002: {
			why: (p: { handlerPath: unknown }) => `Cannot migrate \`handlerPath\` to \`mountPath\`, it is not a static path ending in \`/**\`: ${inspect(p.handlerPath)}`,
			fix: 'Replace `handlerPath` with `mountPath` manually.',
		},
	},
})
