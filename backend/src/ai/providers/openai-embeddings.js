import { env } from '../../config/env.js'
import { aiProviderError } from '../../utils/errors.js'
import { childLogger } from '../../utils/logger.js'

const log = childLogger({ module: 'openai-embeddings' })
const TIMEOUT_MS = 60_000
const BATCH_SIZE = 64

export const openaiEmbeddingProvider = {
  name: `openai:${env.EMBEDDING_MODEL}`,
  dimensions: env.EMBEDDING_DIMENSIONS,
  isMock: false,

  async embed(texts) {
    const out = []
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE).map((t) => String(t ?? '').slice(0, 8000))
      out.push(...(await this.embedBatch(batch)))
    }
    return out
  },

  async embedBatch(batch) {
    const url = `${env.EMBEDDING_BASE_URL.replace(/\/$/, '')}/embeddings`
    let lastErr
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.EMBEDDING_API_KEY}`
          },
          body: JSON.stringify({
            model: env.EMBEDDING_MODEL,
            input: batch,
            dimensions: env.EMBEDDING_DIMENSIONS
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })
        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          lastErr = new Error(`Embeddings HTTP ${res.status}: ${errText.slice(0, 300)}`)
          if (res.status === 429 || res.status >= 500) {
            await new Promise((r) => setTimeout(r, 400 * attempt))
            continue
          }
          break
        }
        const data = await res.json()
        const rows = [...(data?.data ?? [])].sort((a, b) => a.index - b.index).map((d) => d.embedding)
        if (rows.length !== batch.length || rows.some((v) => !Array.isArray(v))) {
          log.error({ expected: batch.length, got: rows.length }, 'embedding response shape mismatch')
          throw aiProviderError()
        }
        return rows
      } catch (err) {
        if (err && err.name === 'AppError') throw err
        lastErr = err instanceof Error ? err : new Error(String(err))
        await new Promise((r) => setTimeout(r, 400 * attempt))
      }
    }
    log.error({ err: String(lastErr) }, 'embedding request failed after retries')
    throw aiProviderError()
  }
}
