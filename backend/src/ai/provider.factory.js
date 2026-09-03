import { env } from '../config/env.js'
import { openaiLLMProvider } from './providers/openai-llm.js'
import { openaiEmbeddingProvider } from './providers/openai-embeddings.js'
import { mockLLMProvider } from './providers/mock-llm.js'
import { mockEmbeddingProvider } from './providers/mock-embeddings.js'

let llmInstance = null
let embeddingInstance = null

export function getLLMProvider() {
  if (!llmInstance) {
    llmInstance = env.LLM_PROVIDER === 'openai' ? openaiLLMProvider : mockLLMProvider
  }
  return llmInstance
}

export function getEmbeddingProvider() {
  if (!embeddingInstance) {
    embeddingInstance = env.EMBEDDING_PROVIDER === 'openai' ? openaiEmbeddingProvider : mockEmbeddingProvider
  }
  return embeddingInstance
}

export function providerStatus() {
  const llm = getLLMProvider()
  const embedding = getEmbeddingProvider()
  return {
    llm: llm.name,
    llmMock: llm.isMock,
    embedding: embedding.name,
    embeddingMock: embedding.isMock,
    offlineMode: llm.isMock || embedding.isMock
  }
}
