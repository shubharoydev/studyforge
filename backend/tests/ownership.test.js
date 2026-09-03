import { describe, it, expect } from 'vitest'
import { authenticate } from '../src/middleware/auth.js'
import { signToken } from '../src/utils/auth.js'

const SECRET = 'test-secret-for-ownership-tests!!!'

describe('authenticate middleware', () => {
  function makeRequest(token) {
    const user = { id: null, email: null, name: null }
    const request = {
      headers: { authorization: token ? `Bearer ${token}` : undefined },
      user: null
    }
    const reply = { code: () => reply, send: (d) => d }
    return { request, reply, user }
  }

  it('sets user from valid token', () => {
    const token = signToken({ sub: 'u123', email: 'test@example.com', name: 'Test User' }, SECRET, '1h')
    const { request } = makeRequest(token)
    authenticate(request, {})
    expect(request.user.id).toBe('u123')
    expect(request.user.email).toBe('test@example.com')
  })

  it('throws on missing token', () => {
    const { request } = makeRequest(null)
    expect(() => authenticate(request, {})).toThrow()
  })

  it('throws on invalid token', () => {
    const { request } = makeRequest('invalid.jwt.token')
    expect(() => authenticate(request, {})).toThrow()
  })

  it('throws on wrong secret', () => {
    const token = signToken({ sub: 'u1', email: 'a@b.com', name: 'T' }, 'wrong-secret-32-chars!!!', '1h')
    const { request } = makeRequest(token)
    expect(() => authenticate(request, {})).toThrow()
  })
})

describe('document ownership guard pattern', () => {
  const fakeDocs = [
    { id: 'd1', userId: 'user-a', name: 'Doc A' },
    { id: 'd2', userId: 'user-b', name: 'Doc B' }
  ]

  function findOwnedDoc(userId, docId) {
    const doc = fakeDocs.find((d) => d.id === docId)
    if (!doc || doc.userId !== userId) return null
    return doc
  }

  it('returns document for owner', () => {
    expect(findOwnedDoc('user-a', 'd1')?.name).toBe('Doc A')
  })

  it('returns null for non-owner', () => {
    expect(findOwnedDoc('user-b', 'd1')).toBeNull()
  })

  it('returns null for nonexistent document', () => {
    expect(findOwnedDoc('user-a', 'd999')).toBeNull()
  })
})
