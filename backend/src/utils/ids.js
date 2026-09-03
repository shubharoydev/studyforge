import crypto from 'node:crypto'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

export function newId(prefix = '') {
  const bytes = crypto.randomBytes(12)
  let id = ''
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length]
  return prefix ? `${prefix}_${id}` : id
}

export function uuid() {
  return crypto.randomUUID()
}
