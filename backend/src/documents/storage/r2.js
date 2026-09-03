import { randomUUID } from 'node:crypto'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../../config/env.js'
import { serviceUnavailable } from '../../utils/errors.js'
import { childLogger } from '../../utils/logger.js'

const log = childLogger({ module: 'storage:r2' })

export const r2Storage = {
  name: 'r2',

  _client() {
    return new S3Client({
      region: env.R2_REGION || 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      }
    })
  },

  async save(userId, buffer, originalName) {
    const ext = (originalName.split('.').pop() || 'pdf').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const storageKey = `${userId}/${randomUUID()}.${ext}`
    const bucket = env.R2_BUCKET

    try {
      await this._client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: 'application/pdf'
        })
      )
    } catch (err) {
      log.error({ storageKey, err: String(err) }, 'R2 upload failed')
      throw serviceUnavailable('Cloud file storage returned an error. Please try again.')
    }

    log.info({ userId, storageKey, size: buffer.length }, 'file saved to Cloudflare R2')
    // The object is private; if R2_PUBLIC_URL is set the file is publicly readable:
    const publicBase = env.R2_PUBLIC_URL?.replace(/\/$/, '')
    return { fileUrl: publicBase ? `${publicBase}/${storageKey}` : '', storageKey }
  },

  async open(storageKey) {
    try {
      const res = await this._client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: storageKey }))
      return Buffer.from(await res.Body.transformToByteArray())
    } catch (err) {
      log.error({ storageKey, err: String(err) }, 'R2 read failed')
      throw serviceUnavailable('Failed to read stored file from cloud storage')
    }
  },

  async delete(storageKey) {
    try {
      await this._client().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: storageKey }))
    } catch (err) {
      log.warn({ storageKey, err: String(err) }, 'R2 delete failed')
    }
  }
}
