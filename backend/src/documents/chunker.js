function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function splitIntoChunks(text, pageNumber, maxChars, overlapChars, chunkIndex) {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return []

  const chunks = []
  let current = ''
  let startPage = pageNumber
  let idx = chunkIndex

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    if (current.length + sentence.length + 1 > maxChars && current.length > 0) {
      chunks.push({ content: current.trim(), pageNumber: startPage, chunkIndex: idx++ })
      const overlapText = current.slice(-overlapChars)
      const spaceIdx = overlapText.indexOf(' ')
      current = (spaceIdx > 0 ? overlapText.slice(spaceIdx + 1) : '') + ' ' + sentence
      if (current.trim().length === 0) current = sentence
    } else {
      current = current ? current + ' ' + sentence : sentence
    }
  }
  if (current.trim().length > 0) {
    chunks.push({ content: current.trim(), pageNumber: startPage, chunkIndex: idx++ })
  }
  return chunks
}

export function chunkPages(pages, opts = {}) {
  const maxChars = opts.maxChars ?? 900
  const overlapChars = Math.min(opts.overlapChars ?? 150, maxChars - 100)

  const allChunks = []
  let globalIdx = 0
  for (let p = 0; p < pages.length; p++) {
    const text = pages[p]
    if (!text || text.trim().length === 0) continue
    const pageChunks = splitIntoChunks(text, p + 1, maxChars, overlapChars, globalIdx)
    allChunks.push(...pageChunks)
    globalIdx += pageChunks.length
  }
  return allChunks
}
