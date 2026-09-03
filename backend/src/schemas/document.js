import { z } from 'zod'

export const listDocumentsSchema = z.object({
  status: z.enum(['UPLOADING', 'PROCESSING', 'INDEXING', 'READY', 'FAILED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
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
