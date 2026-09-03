import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

export function signToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn, issuer: 'studyforge-ai' })
}

export function verifyToken(token, secret) {
  const decoded = jwt.verify(token, secret, { issuer: 'studyforge-ai' })
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid token payload')
  }
  return {
    sub: decoded.sub,
    email: String(decoded.email ?? ''),
    name: String(decoded.name ?? '')
  }
}
