import { listDocuments, getDocument, deleteDocument, saveUpload, generateSummary } from '../services/documents.service.js'
import { validate, listDocumentsSchema } from '../schemas/document.js'

export async function listDocumentsHandler(request) {
  const { error, data } = validate(listDocumentsSchema, request.query)
  const docs = await listDocuments(request.user.id, error ? {} : data)
  return { documents: docs }
}

export async function uploadHandler(request, reply) {
  const file = await request.file()
  if (!file) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'No file uploaded' })

  const chunks = []
  for await (const chunk of file.file) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  const doc = await saveUpload(request.user.id, {
    buffer,
    mimetype: file.mimetype,
    size: buffer.length,
    originalname: file.filename || file.originalname || 'document.pdf'
  })
  return reply.code(201).send({ document: doc })
}

export async function getDocumentHandler(request) {
  const doc = await getDocument(request.user.id, request.params.id)
  return { document: doc }
}

export async function deleteDocumentHandler(request) {
  await deleteDocument(request.user.id, request.params.id)
  return { success: true }
}

export async function summaryHandler(request) {
  const summary = await generateSummary(request.user.id, request.params.id)
  return { summary }
}
