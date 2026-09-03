export const STOPWORDS = new Set(
  `a an the and or but if then else of to in on for with without from by as at is are was were be been being it its this that these those what which who whom how why when where can could should would will shall may might must do does did done not no nor so than too very just about into over under again further once here there all any both each few more most other some such only own same s t don now
  i you he she they we me him her them my your his their our us am`
    .split(/\s+/)
    .filter(Boolean)
)

export function tokenize(text) {
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
  return words
}

export function splitSentences(text) {
  const normalized = String(text).replace(/\s+\n\s+/g, '\n')
  const parts = normalized
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 600 && /[a-zA-Z]/.test(s))
  return parts
}

export function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle(arr, seed) {
  const rand = mulberry32(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function titleCase(s) {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function truncate(s, n) {
  const str = String(s).trim()
  return str.length <= n ? str : `${str.slice(0, n - 1).trimEnd()}…`
}
