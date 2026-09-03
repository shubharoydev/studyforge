import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { childLogger } from '../../utils/logger.js'

const log = childLogger({ module: 'storage:local' })

function baseDir() {
  return path.resolve(env.STORAGE_LOCAL_DIR)
}

export const localStorage = {
  name: 'local',

  async save(userId, buffer, originalName) {
    const dir = path.join(baseDir(), userId)
    await fs.mkdir(dir, { recursive: true })
    const ext = path.extname(originalName) || '.pdf'
    const filename = `${randomUUID()}${ext}`
    const fullPath = path.join(dir, filename)
    await fs.writeFile(fullPath, buffer)
    log.info({ userId, filename, size: buffer.length }, 'file saved locally')
    return { fileUrl: `/files/${userId}/${filename}`, storageKey: fullPath }
  },

  async open(storageKey) {
    return fs.readFile(storageKey)
  },

  async delete(storageKey) {
    try {
      await fs.unlink(storageKey)
    } catch (err) {
      if (err.code !== 'ENOENT') log.warn({ storageKey, err: String(err) }, 'failed to delete local file')
    }
  }
}
