import { z } from 'zod'

export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  conversationId: z.string().min(1).optional(),
  documentId: z.string().min(1).optional()
})

export const conversationListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0)
})

export function validate(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join(', ')
    return { error: msg, data: null }
  }
  return { error: null, data: result.data }
}
