import { prisma } from '../db/prisma.js'
import { hashPassword, verifyPassword, signToken } from '../utils/auth.js'
import { env } from '../config/env.js'
import { conflict, invalidCredentials, notFound } from '../utils/errors.js'

export async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) throw conflict('An account with this email already exists')
  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), passwordHash } })
  const token = signToken({ sub: user.id, email: user.email, name: user.name }, env.AUTH_SECRET, env.AUTH_TOKEN_TTL)
  return { token, user: { id: user.id, name: user.name, email: user.email } }
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) throw invalidCredentials()
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) throw invalidCredentials()
  const token = signToken({ sub: user.id, email: user.email, name: user.name }, env.AUTH_SECRET, env.AUTH_TOKEN_TTL)
  return { token, user: { id: user.id, name: user.name, email: user.email } }
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('User not found')
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
}

export async function updateProfile(userId, { name }) {
  const user = await prisma.user.update({ where: { id: userId }, data: { name } })
  return { id: user.id, name: user.name, email: user.email }
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) throw invalidCredentials()
  const hash = await hashPassword(newPassword)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
}
