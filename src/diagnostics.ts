import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = defineDiagnostics({
	// Thrown errors only print `why`; the reporter is what surfaces `fix` to the user.
	reporters: [createConsoleReporter({ method: 'error' })],
	codes: {
		NITRO_BETTER_AUTH_C0001: {
			why: 'Both `mountPath` and the deprecated `handlerPath` are configured.',
			fix: 'Remove `handlerPath`.',
		},
		NITRO_BETTER_AUTH_C0002: {
			why: (p: { handlerPath: unknown }) => `Cannot migrate \`handlerPath\` to \`mountPath\`: ${JSON.stringify(p.handlerPath)}`,
			fix: 'Use a static path ending in `/**`, or replace it with `mountPath` manually.',
		},
	},
})
