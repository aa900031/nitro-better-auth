export default eventHandler(async (event) => {
	const headers = getHeaders(event)
	const betterAuth = useBetterAuth()
	const resp = await betterAuth.api.signInAnonymous({
		asResponse: true,
		headers,
	})

	return resp
})
