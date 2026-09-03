import { describe, it, expect } from 'vitest'
import { chunkPages } from '../src/documents/chunker.js'

describe('chunkPages', () => {
  it('splits a single page into chunks respecting maxChars', () => {
    const text = 'Sentence one. ' .repeat(100)
    const chunks = chunkPages([text], { maxChars: 200, overlapChars: 40 })
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(250)
      expect(c.pageNumber).toBe(1)
    }
  })

  it('preserves page numbers correctly across pages', () => {
    const pages = ['Page one content here with enough text to chunk. ' .repeat(5), '', 'Page three content here with enough text to chunk. ' .repeat(5)]
    const chunks = chunkPages(pages, { maxChars: 300, overlapChars: 50 })
    const pageNums = [...new Set(chunks.map((c) => c.pageNumber))]
    expect(pageNums).toContain(1)
    expect(pageNums).toContain(3)
    expect(pageNums).not.toContain(2)
  })

  it('returns empty array for empty pages', () => {
    expect(chunkPages([], {})).toEqual([])
    expect(chunkPages(['', '  ', ''], {})).toEqual([])
  })

  it('handles a page shorter than maxChars as a single chunk', () => {
    const pages = ['This is short']
    const chunks = chunkPages(pages, { maxChars: 500 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toBe('This is short')
    expect(chunks[0].chunkIndex).toBe(0)
  })

  it('assigns sequential chunk indices', () => {
    const pages = ['A'.repeat(500), 'B'.repeat(500)]
    const chunks = chunkPages(pages, { maxChars: 200, overlapChars: 40 })
    expect(chunks[0].chunkIndex).toBe(0)
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(chunks[i - 1].chunkIndex + 1)
    }
  })
})
