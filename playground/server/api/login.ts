export default eventHandler(async () => {
	const betterAuth = useBetterAuth()
	const resp = await betterAuth.api.signInAnonymous()

	return {
		success: true,
		data: resp,
	}
})
