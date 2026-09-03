import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { aiProviderError } from '../../utils/errors.js'
import { childLogger } from '../../utils/logger.js'

const log = childLogger({ module: 'storage:supabase' })

function headers(extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    ...extra
  }
}

export const supabaseStorage = {
  name: 'supabase',

  async save(userId, buffer, originalName) {
    const ext = (originalName.split('.').pop() || 'pdf').replace(/[^a-z0-9]/gi, '')
    const storageKey = `${userId}/${randomUUID()}.${ext}`
    const url = `${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET}/${storageKey}`

    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...headers({ 'Content-Type': 'application/pdf', 'x-upsert': 'true' }) },
      body: buffer
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      log.error({ status: res.status, detail: txt.slice(0, 300) }, 'supabase upload failed')
      throw aiProviderError('Cloud file storage returned an error. Please try again.')
    }

    const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_BUCKET}/${storageKey}`
    log.info({ userId, storageKey }, 'file saved to supabase storage')
    return { fileUrl: publicUrl, storageKey }
  },

  async open(storageKey) {
    const url = `${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET}/${storageKey}`
    const res = await fetch(url, { headers: headers() })
    if (!res.ok) throw aiProviderError('Failed to read stored file from cloud storage')
    return Buffer.from(await res.arrayBuffer())
  },

  async delete(storageKey) {
    const url = `${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET}/${storageKey}`
    const res = await fetch(url, { method: 'DELETE', headers: headers() })
    if (!res.ok) log.warn({ storageKey, status: res.status }, 'supabase delete returned non-OK')
  }
}
