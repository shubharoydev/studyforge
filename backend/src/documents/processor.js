import { env } from '../config/env.js'
import { getEmbeddingProvider } from '../ai/provider.factory.js'
import { insertChunks } from './vector-store.js'
import { extractPdfPages } from './extract.js'
import { cleanPageText, stripBoilerplate } from './clean.js'
import { chunkPages } from './chunker.js'
import { prisma } from '../db/prisma.js'
import { childLogger } from '../utils/logger.js'
import { userSafeMessage } from '../utils/errors.js'
import { storage } from './storage.js'

const log = childLogger({ module: 'processor' })
const MAX_CONCURRENCY = 2
let queue = []
let running = 0

function enqueue(documentId) {
  queue.push(documentId)
  processQueue()
}

function processQueue() {
  while (running < MAX_CONCURRENCY && queue.length > 0) {
    const docId = queue.shift()
    running++
    processDocument(docId)
      .catch((err) => log.error({ docId, err: String(err) }, 'unhandled processor error'))
      .finally(() => {
        running--
        processQueue()
      })
  }
}

async function processDocument(documentId) {
  log.info({ documentId }, 'processing started')
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING', errorMessage: null }
    })
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } })
    const buffer = await storage.open(doc.storageKey)

    const { pages, pageCount } = await extractPdfPages(buffer)
    log.info({ documentId, pageCount }, 'pdf text extracted')

    const cleaned = pages.map((p) => cleanPageText(p))
    const deduplicated = stripBoilerplate(cleaned)

    const textSample = deduplicated.join('\n\n').slice(0, 8000)

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'INDEXING', pageCount }
    })

    const rawChunks = chunkPages(deduplicated)
    const embeddingProvider = getEmbeddingProvider()
    const texts = rawChunks.map((c) => c.content)
    const embeddings = await embeddingProvider.embed(texts)
    log.info({ documentId, chunks: rawChunks.length }, 'embeddings generated')

    const chunks = rawChunks.map((c, i) => ({
      ...c,
      embedding: embeddings[i],
      metadata: {
        endPage: c.pageNumber,
        charCount: c.content.length,
        textSample: c.content.slice(0, 300)
      }
    }))

    await insertChunks(documentId, chunks)
    log.info({ documentId, chunks: chunks.length }, 'chunks inserted')

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'READY', pageCount, errorMessage: null }
    })
    log.info({ documentId }, 'processing complete')
  } catch (err) {
    log.error({ documentId, err: String(err), stack: err.stack }, 'processing failed')
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED', errorMessage: userSafeMessage(err).slice(0, 500) }
    }).catch(() => {})
  }
}

export function kickProcessing(documentId) {
  enqueue(documentId)
}

export async function resumeStuckDocuments() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000)
  const updated = await prisma.document.updateMany({
    where: { status: { in: ['PROCESSING', 'INDEXING'] }, updatedAt: { lt: cutoff } },
    data: { status: 'FAILED', errorMessage: 'Processing was interrupted and timed out.' }
  })
  if (updated.count > 0) log.warn({ count: updated.count }, 'resumed stuck documents to FAILED')
}
