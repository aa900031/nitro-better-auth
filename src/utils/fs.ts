import { open } from 'node:fs/promises'

export async function resolvePathType(path: string) {
	const fd = await open(path, 'r').catch(() => null)
	try {
		const stats = await fd?.stat()
		if (stats) {
			return {
				path,
				type: stats.isFile() ? 'file' : 'dir',
			}
		}
	}
	finally {
		fd?.close()
	}
}
