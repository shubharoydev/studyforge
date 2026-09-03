export function extractJson(text) {
  if (!text) throw new Error('Empty AI response')
  let cleaned = text.trim()
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) cleaned = fence[1].trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in AI response')
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}
