import { prisma } from '../db/prisma.js'
import { storage } from '../documents/storage.js'
import { kickProcessing } from '../documents/processor.js'
import { notFound, badRequest, forbidden, payloadTooLarge, unsupportedMedia } from '../utils/errors.js'
import { env } from '../config/env.js'

const ALLOWED_MIME = ['application/pdf']
const MAX_SIZE = env.maxUploadBytes

export async function listDocuments(userId, { status, limit, offset } = {}) {
  const where = { userId }
  if (status) where.status = status
  return prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      name: true,
      fileType: true,
      fileSize: true,
      status: true,
      pageCount: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { chunks: true, quizzes: true } }
    }
  })
}

export async function getDocument(userId, documentId) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc || doc.userId !== userId) throw notFound('Document not found')
  return doc
}

export async function deleteDocument(userId, documentId) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc || doc.userId !== userId) throw notFound('Document not found')
  if (doc.storageKey) await storage.delete(doc.storageKey).catch(() => {})
  await prisma.$transaction([
    prisma.documentChunk.deleteMany({ where: { documentId } }),
    prisma.document.delete({ where: { id: documentId } })
  ])
}

export async function saveUpload(userId, file) {
  if (!ALLOWED_MIME.includes(file.mimetype)) throw unsupportedMedia('Only PDF files are supported')
  if (file.size > MAX_SIZE) throw payloadTooLarge(`File is too large. Maximum size is ${env.MAX_UPLOAD_MB} MB`)
  if (file.size === 0) throw badRequest('Uploaded file is empty')

  const header = file.buffer.slice(0, 5).toString('ascii')
  if (!header.startsWith('%PDF')) throw badRequest('This does not appear to be a valid PDF file')

  const doc = await prisma.document.create({
    data: {
      userId,
      name: file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200),
      fileType: file.mimetype,
      fileSize: file.size,
      status: 'UPLOADING'
    }
  })

  const { fileUrl, storageKey } = await storage.save(userId, file.buffer, file.originalname)

  await prisma.document.update({
    where: { id: doc.id },
    data: { fileUrl, storageKey, status: 'PROCESSING' }
  })

  kickProcessing(doc.id)
  return doc
}

export async function generateSummary(userId, documentId) {
  const doc = await getDocument(userId, documentId)
  if (doc.status !== 'READY') throw badRequest('Document must be fully processed before generating a summary')

  const { documentSummarySchema, validate } = await import('../schemas/quiz.js')
  const { getLLMProvider } = await import('../ai/provider.factory.js')
  const { buildSummarySystemPrompt, buildSummaryUserPrompt, buildContextSection, CONTEXT_START } = await import('../ai/prompts.js')
  const { extractJson } = await import('../utils/json.js')
  const { aiGenerationFailed } = await import('../utils/errors.js')

  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
    take: 16
  })

  const blocks = chunks.map((c, i) => ({
    index: i + 1,
    documentName: doc.name,
    pageNumber: c.pageNumber,
    content: String(c.content)
  }))

  const ctxBlock = buildContextSection(blocks)

  const llm = getLLMProvider()
  const raw = await llm.complete({
    messages: [
      { role: 'system', content: buildSummarySystemPrompt() },
      { role: 'user', content: `${ctxBlock}\n\nPlease summarize the above document.` }
    ],
    temperature: 0.1,
    jsonMode: llm.isMock
  })

  let parsed
  try {
    parsed = extractJson(raw)
  } catch {
    throw aiGenerationFailed('The AI returned an unexpected response. Please try again.')
  }
  const result = validate(documentSummarySchema, parsed)
  if (result.error) throw aiGenerationFailed(`AI output was invalid: ${result.error}`)

  await prisma.document.update({ where: { id: documentId }, data: { summary: result.data } })
  return result.data
}
