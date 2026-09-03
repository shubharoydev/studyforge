import { env } from '../../config/env.js'
import { aiProviderError } from '../../utils/errors.js'
import { childLogger } from '../../utils/logger.js'

const log = childLogger({ module: 'openai-llm' })
const TIMEOUT_MS = 90_000

function buildBody(opts, stream) {
  const body = {
    model: env.LLM_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? env.LLM_TEMPERATURE,
    stream
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens
  if (opts.jsonMode) body.response_format = { type: 'json_object' }
  return body
}

async function request(body) {
  const url = `${env.LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LLM_API_KEY}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      if (res.ok) return res
      const errText = await res.text().catch(() => '')
      lastErr = new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 300)}`)
      if (!(res.status === 429 || res.status >= 500)) {
        log.error({ status: res.status, detail: errText.slice(0, 500) }, 'llm request failed')
        throw aiProviderError()
      }
    } catch (err) {
      if (err && err.name === 'AppError') throw err
      lastErr = err instanceof Error ? err : new Error(String(err))
    }
    await new Promise((r) => setTimeout(r, 400 * attempt))
  }
  log.error({ err: String(lastErr) }, 'llm request failed after retries')
  throw aiProviderError()
}

export const openaiLLMProvider = {
  name: `openai:${env.LLM_MODEL}`,
  isMock: false,

  async complete(opts) {
    const res = await request(buildBody(opts, false))
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      log.error({ keys: Object.keys(data ?? {}) }, 'unexpected llm response shape')
      throw aiProviderError()
    }
    return content
  },

  async *completeStream(opts) {
    const res = await request(buildBody(opts, true))
    if (!res.body) throw aiProviderError()
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let sepIdx
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIdx)
        buffer = buffer.slice(sepIdx + 2)
        for (const line of rawEvent.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') return
          try {
            const json = JSON.parse(payload)
            const delta = json?.choices?.[0]?.delta?.content
            if (typeof delta === 'string' && delta.length > 0) yield delta
          } catch {
            // eslint-disable-next-line no-unused-vars
          }
        }
      }
    }
  }
}
