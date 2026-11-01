import type { Nitro } from 'nitropack/types'
import type { ResolvedMoudleOptions } from '..'
import { genObjectFromValues } from 'knitwork'
import { addVirtualFile } from '../utils/nitro'

export function addServerOptionsContext(
	nitro: Nitro,
	options: ResolvedMoudleOptions,
): void {
	addVirtualFile(nitro, {
		alias: '#nitro-better-auth/server-options-context.mjs',
		getContent: () => {
			return /* typescript */`
export default ${genObjectFromValues({
	dev: nitro.options.dev,
	mountPath: options.mountPath,
})}
`
		},
	})
}
