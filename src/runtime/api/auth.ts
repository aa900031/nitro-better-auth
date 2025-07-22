import { eventHandler, toWebRequest, useBetterAuth } from '#imports'

export default eventHandler((event) => {
	const betterAuth = useBetterAuth(event)
	return betterAuth.handler(toWebRequest(event))
})
