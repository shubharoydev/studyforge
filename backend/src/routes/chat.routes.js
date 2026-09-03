import { ask, stream, listConversations, getConversation, deleteConversation } from '../services/chat.service.js'
import { validate, chatRequestSchema, conversationListSchema } from '../schemas/chat.js'

export async function chatHandler(request) {
  const { error, data } = validate(chatRequestSchema, request.body)
  if (error) return { error: 'VALIDATION_ERROR', message: error }
  const result = await ask({ userId: request.user.id, ...data })
  return result
}

export async function chatStreamHandler(request, reply) {
  const { error, data } = validate(chatRequestSchema, request.body)
  if (error) {
    reply.code(400).header('Content-Type', 'application/json')
    return { error: 'VALIDATION_ERROR', message: error }
  }
  await stream({ userId: request.user.id, ...data }, reply)
}

export async function listConversationsHandler(request) {
  const { error, data } = validate(conversationListSchema, request.query)
  const conversations = await listConversations(request.user.id, error ? { limit: 20, offset: 0 } : data)
  return { conversations }
}

export async function getConversationHandler(request) {
  const conversation = await getConversation(request.user.id, request.params.id)
  return conversation
}

export async function deleteConversationHandler(request) {
  await deleteConversation(request.user.id, request.params.id)
  return { success: true }
}
