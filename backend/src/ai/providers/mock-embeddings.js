import { env } from '../../config/env.js'
import { tokenize, fnv1a } from '../mock/text.js'

const DIMS = () => env.EMBEDDING_DIMENSIONS

function embedOne(text) {
  const dims = DIMS()
  const vec = new Array(dims).fill(0)
  const tokens = tokenize(text)
  for (const token of tokens) {
    vec[fnv1a(token) % dims] += 1
    vec[fnv1a(`${token}#bigram`) % dims] += 0.4
    for (let i = 0; i < token.length - 2; i++) {
      vec[fnv1a(token.slice(i, i + 3)) % dims] += 0.15
    }
  }
  let norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0))
  if (norm === 0) norm = 1
  return vec.map((v) => v / norm)
}

export const mockEmbeddingProvider = {
  name: 'mock-hash',
  dimensions: DIMS(),
  isMock: true,

  async embed(texts) {
    return texts.map((t) => embedOne(String(t ?? '').slice(0, 4000)))
  }
}
