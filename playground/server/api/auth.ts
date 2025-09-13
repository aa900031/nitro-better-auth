export default eventHandler({
	onRequest: [
		AuthenticateMiddleware,
	],
	handler: async (event) => {
		return event.context.auth
	},
})
