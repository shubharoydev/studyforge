import { env } from '../config/env.js'
import { getEmbeddingProvider } from '../ai/provider.factory.js'
import { searchChunksByVector } from '../documents/vector-store.js'
import { prisma } from '../db/prisma.js'
import { childLogger } from '../utils/logger.js'

const log = childLogger({ module: 'retriever' })

const STOPWORDS = new Set(
  'a an the and or but if then else of to in on for with without from by as at is are was were be been being it its this that these those what which who whom how why when where can could should would will shall may might must do does did done not no nor so than too very just about into over under again further once here there all any both each few more most other some such only own same s t don now i you he she they we me him her them my your his their our us am'.split(/\s+/)
)

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
}

async function searchChunksByKeyword(userId, query, opts = {}) {
  const topK = opts.topK ?? 8
  const minScore = opts.minScore ?? 0.01
  const docFilter = opts.documentIds && opts.documentIds.length > 0
    ? prisma.sql`AND d."id" IN (${prisma.join(opts.documentIds.map(String))})`
    : prisma.sql``

  const rows = await prisma.$queryRaw`
    SELECT
      c."id" AS "chunkId",
      c."documentId",
      d."name" AS "documentName",
      c."pageNumber",
      c."content",
      c."chunkIndex"
    FROM "DocumentChunk" c
    JOIN "Document" d ON d."id" = c."documentId"
    WHERE d."userId" = ${userId} AND d."status" = 'READY' ${docFilter}
    ORDER BY c."chunkIndex" DESC
    LIMIT 800
  `

  const queryTerms = tokenize(query)
  if (queryTerms.length === 0) return rows.slice(0, topK).map((r) => ({ ...r, similarity: 0 }))

  const scored = rows.map((row) => {
    const contentTokens = tokenize(row.content)
    const tokenSet = new Map()
    for (const t of contentTokens) tokenSet.set(t, (tokenSet.get(t) ?? 0) + 1)
    let score = 0
    let distinct = 0
    for (const qt of queryTerms) {
      const c = tokenSet.get(qt)
      if (c) {
        distinct++
        score += c * (1 + 0.5 / (1 + (tokenSet.size > 100 ? 0.3 : 1)))
      }
    }
    if (distinct >= 2) score *= 1.5
    return { ...row, similarity: score / Math.max(1, contentTokens.length) }
  })

  return scored.filter((r) => r.similarity >= minScore).sort((a, b) => b.similarity - a.similarity).slice(0, topK)
}

export async function retrieve(userId, question, opts = {}) {
  const useKeyword = env.EMBEDDING_PROVIDER === 'mock'
  if (useKeyword) {
    log.debug({ userId }, 'using keyword retriever')
    return searchChunksByKeyword(userId, question, opts)
  }
  log.debug({ userId }, 'using vector retriever')
  const embeddingProvider = getEmbeddingProvider()
  const [qEmb] = await embeddingProvider.embed([question])
  return searchChunksByVector(userId, qEmb, opts)
}
