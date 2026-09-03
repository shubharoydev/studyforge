import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Please provide a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128)
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional()
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128)
})

export function validate(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join(', ')
    return { error: msg, data: null }
  }
  return { error: null, data: result.data }
}
