import { verifyToken } from '../utils/auth.js'
import { unauthorized } from '../utils/errors.js'
import { env } from '../config/env.js'

export async function authenticate(request, reply) {
  const header = request.headers.authorization
  if (!header || !header.startsWith('Bearer ')) throw unauthorized()
  const token = header.slice(7)
  try {
    const payload = verifyToken(token, env.AUTH_SECRET)
    request.user = { id: payload.sub, email: payload.email, name: payload.name }
  } catch {
    throw unauthorized('Invalid or expired token')
  }
}
