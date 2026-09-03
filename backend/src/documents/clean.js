export function cleanPageText(raw) {
  let text = String(raw ?? '')
  text = text.replace(/\r\n?/g, '\n')
  text = text.replace(/([a-z])-\n([a-z])/g, '$1$2')
  const lines = text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim())
  const filtered = lines.filter((l) => !/^\s*(page\s*)?\d{1,4}\s*$/i.test(l))
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function normalizeLine(l) {
  return l.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80)
}

export function detectBoilerplate(pages) {
  if (pages.length < 4) return new Set()
  const counts = new Map()
  for (const page of pages) {
    const seen = new Set()
    for (const line of page.split('\n')) {
      if (line.length === 0 || line.length > 80) continue
      const key = normalizeLine(line)
      if (!key || seen.has(key)) continue
      seen.add(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const threshold = pages.length * 0.6
  return new Set([...counts.entries()].filter(([, c]) => c >= threshold).map(([k]) => k))
}

export function stripBoilerplate(pages) {
  const boilerplate = detectBoilerplate(pages)
  if (boilerplate.size === 0) return pages
  return pages.map((page) =>
    page
      .split('\n')
      .filter((l) => !boilerplate.has(normalizeLine(l)))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
