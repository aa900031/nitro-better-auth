import { createConsoleReporter, defineDiagnostics } from 'nostics'

// Values come from user config: JSON.stringify would return `undefined` or throw for non-strings.
function formatValue(value: unknown): string {
	return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

export const diagnostics = defineDiagnostics({
	// Thrown errors only print `why`; the reporter is what surfaces `fix` to the user.
	reporters: [createConsoleReporter({ method: 'error' })],
	codes: {
		NITRO_BETTER_AUTH_C0001: {
			why: (p: { mountPath: unknown, handlerPath: unknown }) => `Both \`mountPath\` (${formatValue(p.mountPath)}) and the deprecated \`handlerPath\` (${formatValue(p.handlerPath)}) are configured.`,
			fix: 'Remove `handlerPath`.',
		},
		NITRO_BETTER_AUTH_C0002: {
			why: (p: { handlerPath: unknown }) => `Cannot migrate \`handlerPath\` to \`mountPath\`: ${formatValue(p.handlerPath)}`,
			fix: 'Use a static path ending in `/**`, or replace it with `mountPath` manually.',
		},
	},
})
