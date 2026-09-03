import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/utils/auth.js'
import { newId, uuid } from '../src/utils/ids.js'

describe('password hashing', () => {
  it('hashes and verifies correctly', async () => {
    const hash = await hashPassword('testpass123')
    expect(hash).not.toBe('testpass123')
    expect(await verifyPassword('testpass123', hash)).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})

describe('JWT tokens', () => {
  const secret = 'test-secret-key-at-least-32-chars!!'

  it('signs and verifies a token', () => {
    const token = signToken({ sub: 'u1', email: 'a@b.com', name: 'Test' }, secret, '1h')
    const payload = verifyToken(token, secret)
    expect(payload.sub).toBe('u1')
    expect(payload.email).toBe('a@b.com')
  })

  it('throws on invalid token', () => {
    expect(() => verifyToken('garbage', secret)).toThrow()
  })

  it('throws on wrong secret', () => {
    const token = signToken({ sub: 'u1', email: 'a@b.com', name: 'T' }, secret, '1h')
    expect(() => verifyToken(token, 'wrong-secret-32-chars!!!')).toThrow()
  })
})

describe('ID generation', () => {
  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()))
    expect(ids.size).toBe(100)
  })

  it('prepends prefix when provided', () => {
    const id = newId('doc')
    expect(id.startsWith('doc_')).toBe(true)
  })

  it('generates valid UUIDs', () => {
    const id = uuid()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
