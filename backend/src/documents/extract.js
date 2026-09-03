import { extractText, getDocumentProxy } from 'unpdf'
import { documentParseFailed } from '../utils/errors.js'

export async function extractPdfPages(buffer) {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { totalPages, text } = await extractText(pdf, { mergePages: false })
    const pages = Array.isArray(text) ? text : [text]
    return {
      pages,
      pageCount: totalPages ?? pages.length
    }
  } catch (err) {
    throw documentParseFailed(`PDF extraction failed: ${err.message}`)
  }
}
