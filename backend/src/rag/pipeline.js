import { getLLMProvider } from '../ai/provider.factory.js'
import { buildRagSystemPrompt } from '../ai/prompts.js'
import { retrieve } from './retriever.js'

export function buildSourceBlocks(chunks) {
  return chunks.map((c, i) => ({
    index: i + 1,
    chunkId: c.chunkId,
    documentId: c.documentId,
    documentName: c.documentName,
    pageNumber: c.pageNumber,
    content: c.content
  }))
}

export function buildMessages(history, question, blocks) {
  const messages = [{ role: 'system', content: buildRagSystemPrompt(blocks) }]
  const recent = history.slice(-8)
  for (const m of recent) {
    messages.push({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content })
  }
  messages.push({ role: 'user', content: question })
  return messages
}

export function parseCitations(answerText, blocks) {
  const markers = new Set()
  const re = /\[(\d{1,2})\]/g
  let m
  while ((m = re.exec(answerText)) !== null) {
    const n = Number(m[1])
    if (n >= 1 && n <= blocks.length) markers.add(n)
  }
  const cited = [...markers].sort((a, b) => a - b)
  if (cited.length === 0 && blocks.length > 0) cited.push(1)
  return cited.map((n) => {
    const b = blocks[n - 1]
    return {
      documentId: b.documentId,
      documentName: b.documentName,
      pageNumber: b.pageNumber,
      relevantExcerpt: b.content.slice(0, 350)
    }
  })
}

export async function answer({ userId, history, question, documentIds }) {
  const chunks = await retrieve(userId, question, { topK: 6, documentIds })
  if (chunks.length === 0) {
    return {
      answer: "I couldn't find any relevant information in your uploaded documents. Try rephrasing your question or upload a document that covers this topic.",
      citations: [],
      sourcesUsed: 0,
      mock: false
    }
  }
  const blocks = buildSourceBlocks(chunks)
  const messages = buildMessages(history, question, blocks)
  const llm = getLLMProvider()
  const raw = await llm.complete({ messages })
  const citations = parseCitations(raw, blocks)
  return {
    answer: raw,
    citations,
    sourcesUsed: chunks.length,
    mock: llm.isMock
  }
}

export async function* streamAnswer({ userId, history, question, documentIds }) {
  const chunks = await retrieve(userId, question, { topK: 6, documentIds })
  if (chunks.length === 0) {
    yield { type: 'token', data: "I couldn't find any relevant information in your uploaded documents. Try rephrasing your question or upload a document that covers this topic." }
    yield { type: 'sources', data: [] }
    return
  }
  const blocks = buildSourceBlocks(chunks)
  const messages = buildMessages(history, question, blocks)
  const llm = getLLMProvider()
  let fullAnswer = ''
  try {
    for await (const chunk of llm.completeStream({ messages })) {
      fullAnswer += chunk
      yield { type: 'token', data: chunk }
    }
  } catch {
    yield { type: 'error', data: 'AI stream interrupted. Please try again.' }
    return
  }
  const citations = parseCitations(fullAnswer, blocks)
  yield { type: 'sources', data: citations }
}
