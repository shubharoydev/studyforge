import { prisma } from '../db/prisma.js'
import { answer, streamAnswer, parseCitations, buildSourceBlocks } from '../rag/pipeline.js'
import { retrieve } from '../rag/retriever.js'
import { notFound } from '../utils/errors.js'
import { childLogger } from '../utils/logger.js'

const log = childLogger({ module: 'chat-service' })

export async function ask({ userId, conversationId, message, documentId }) {
  let conversation
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation || conversation.userId !== userId) throw notFound('Conversation not found')
  } else {
    const title = message.length > 60 ? message.slice(0, 57) + '...' : message
    conversation = await prisma.conversation.create({ data: { userId, title } })
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: 'USER', content: message }
  })

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
    skip: 1
  })

  const historyForPipeline = history.slice(0, -1)
  const docIds = documentId ? [documentId] : undefined

  const result = await answer({ userId, history: historyForPipeline, question: message, documentIds: docIds })

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: result.answer,
      citations: result.citations.length > 0 ? { items: result.citations, mock: result.mock } : undefined
    }
  })

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  })

  return {
    conversationId: conversation.id,
    answer: result.answer,
    citations: result.citations,
    mock: result.mock
  }
}

export async function stream({ userId, conversationId, message, documentId }, res) {
  let conversation
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation || conversation.userId !== userId) throw notFound('Conversation not found')
  } else {
    const title = message.length > 60 ? message.slice(0, 57) + '...' : message
    conversation = await prisma.conversation.create({ data: { userId, title } })
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: 'USER', content: message }
  })

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
    skip: 1
  })

  const historyForPipeline = history.slice(0, -1)
  const docIds = documentId ? [documentId] : undefined
  let fullAnswer = ''
  let citations = []
  let hasError = false

  res.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const send = (event, data) => {
    res.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  send('meta', { conversationId: conversation.id })

  try {
    for await (const evt of streamAnswer({ userId, history: historyForPipeline, question: message, documentIds: docIds })) {
      if (evt.type === 'token') {
        fullAnswer += evt.data
        send('token', { text: evt.data })
      } else if (evt.type === 'sources') {
        citations = evt.data
      } else if (evt.type === 'error') {
        hasError = true
        send('error', { message: evt.data })
      }
    }
  } catch (err) {
    log.error({ userId, err: String(err) }, 'stream failed')
    hasError = true
    send('error', { message: 'AI stream interrupted. Please try again.' })
  }

  if (!hasError && fullAnswer) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: fullAnswer,
        citations: citations.length > 0 ? { items: citations, mock: false } : undefined
      }
    })
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })
  }

  send('done', { assistantDone: true, citations })
  res.raw.end()
}

export async function listConversations(userId, { limit, offset }) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset
  })
}

export async function getConversation(userId, conversationId) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conv || conv.userId !== userId) throw notFound('Conversation not found')
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }
  })
  return { ...conv, messages }
}

export async function deleteConversation(userId, conversationId) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conv || conv.userId !== userId) throw notFound('Conversation not found')
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId } }),
    prisma.conversation.delete({ where: { id: conversationId } })
  ])
}
