import { register, login, getMe, updateProfile, changePassword } from '../services/auth.service.js'
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, validate } from '../schemas/auth.js'

export async function registerHandler(request, reply) {
  const { error, data } = validate(registerSchema, request.body)
  if (error) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: error })
  const result = await register(data)
  return reply.code(201).send(result)
}

export async function loginHandler(request, reply) {
  const { error, data } = validate(loginSchema, request.body)
  if (error) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: error })
  const result = await login(data)
  return reply.send(result)
}

export async function meHandler(request, reply) {
  const user = await getMe(request.user.id)
  return { user }
}

export async function updateMeHandler(request, reply) {
  const { error, data } = validate(updateProfileSchema, request.body)
  if (error) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: error })
  const user = await updateProfile(request.user.id, data)
  return { user }
}

export async function changePasswordHandler(request, reply) {
  const { error, data } = validate(changePasswordSchema, request.body)
  if (error) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: error })
  await changePassword(request.user.id, data)
  return { success: true, message: 'Password updated successfully' }
}
