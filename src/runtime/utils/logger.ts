const warnedMessages = new Set<string>()

export function warnOnce(message: string): void {
	if (warnedMessages.has(message))
		return
	warnedMessages.add(message)
	console.warn(`[nitro-better-auth] ${message}`)
}

/**
 * Exposed for tests only.
 * @internal
 */
export function resetWarnOnce(): void {
	warnedMessages.clear()
}
