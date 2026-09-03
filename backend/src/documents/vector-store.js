import { randomUUID } from 'node:crypto'
import { prisma } from '../db/prisma.js'

function cleanString(input) {
  if (!input) return input
  if (typeof input !== 'string') return input
  return input.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '').replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
}

export async function insertChunks(documentId, chunks) {
  for (const chunk of chunks) {
    const vecStr = Array.isArray(chunk.embedding)
      ? `[${chunk.embedding.map((v) => Number(v.toFixed(6))).join(',')}]`
      : null
    const id = randomUUID()
    const safeChunk = { ...chunk }
    safeChunk.content = cleanString(chunk.content)
    if (chunk.metadata && typeof chunk.metadata === 'object') {
      safeChunk.metadata = Object.fromEntries(
        Object.entries(chunk.metadata).map(([k, v]) => [k, typeof v === 'string' ? cleanString(v) : v])
      )
    }
    const meta = safeChunk.metadata ? JSON.stringify(safeChunk.metadata) : null
    await prisma.$executeRaw`
      INSERT INTO "DocumentChunk" ("id", "documentId", "content", "pageNumber", "chunkIndex", "tokenCount", "metadata", "embedding")
      VALUES (${id}, ${documentId}, ${safeChunk.content}, ${chunk.pageNumber}, ${chunk.chunkIndex}, ${chunk.tokenCount ?? null}::int, ${meta}::jsonb, ${vecStr}::vector)
    `
  }
}

export async function searchChunksByVector(userId, queryEmbedding, opts = {}) {
  const topK = opts.topK ?? 6
  const minSimilarity = opts.minSimilarity ?? 0.12
  const vecStr = `[${queryEmbedding.map((v) => Number(v.toFixed(6))).join(',')}]`
  const docFilter = opts.documentIds && opts.documentIds.length > 0
    ? prisma.sql`AND c."documentId" IN (${prisma.join(opts.documentIds.map(String))})`
    : prisma.sql``

  const rows = await prisma.$queryRaw`
    SELECT
      c."id" AS "chunkId",
      c."documentId",
      d."name" AS "documentName",
      c."pageNumber",
      c."content",
      c."chunkIndex",
      1 - (c."embedding" <=> ${vecStr}::vector) AS "similarity"
    FROM "DocumentChunk" c
    JOIN "Document" d ON d."id" = c."documentId"
    WHERE d."userId" = ${userId}
      AND d."status" = 'READY'
      ${docFilter}
    ORDER BY c."embedding" <=> ${vecStr}::vector
    LIMIT ${topK + 4}
  `
  return rows.filter((r) => Number(r.similarity) >= minSimilarity).slice(0, topK)
}
