import * as fsp from 'node:fs/promises'

export async function resolvePathType(
	path: string,
): Promise<{
	path: string
	type: string
} | undefined> {
	const fd = await fsp.open(path, 'r').catch(() => null)
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
