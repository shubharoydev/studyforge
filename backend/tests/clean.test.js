import { describe, it, expect } from 'vitest'
import { cleanPageText, detectBoilerplate, stripBoilerplate } from '../src/documents/clean.js'

describe('cleanPageText', () => {
  it('removes page number lines', () => {
    const input = 'Some content\n42\nMore content'
    expect(cleanPageText(input)).toBe('Some content\nMore content')
  })

  it('removes lines matching "Page N"', () => {
    const input = 'Content\nPage 5\nEnd'
    expect(cleanPageText(input)).toBe('Content\nEnd')
  })

  it('joins hyphenated line breaks', () => {
    const input = 'compu-\nter science'
    expect(cleanPageText(input)).toBe('computer science')
  })

  it('collapses multiple blank lines', () => {
    const input = 'A\n\n\n\n\nB'
    expect(cleanPageText(input)).toBe('A\n\nB')
  })

  it('handles null/undefined input', () => {
    expect(cleanPageText(null)).toBe('')
    expect(cleanPageText(undefined)).toBe('')
  })
})

describe('detectBoilerplate', () => {
  it('detects lines appearing on >60% of pages', () => {
    const header = 'Course: CS101'
    const pages = [`${header}\nContent A`, `${header}\nContent B`, `${header}\nContent C`, `${header}\nContent D`, `Unique content\nExtra line`]
    const bp = detectBoilerplate(pages)
    expect(bp.size).toBe(0)
  })

  it('returns empty for fewer than 4 pages', () => {
    expect(detectBoilerplate(['a', 'b', 'c']).size).toBe(0)
  })

  it('detects repeated short lines', () => {
    const header = 'Introduction to Machine Learning'
    const pages = Array.from({ length: 5 }, (_, i) => `${header}\nPage ${i + 1} content`)
    const bp = detectBoilerplate(pages)
    expect(bp.size).toBeGreaterThanOrEqual(1)
  })
})

describe('stripBoilerplate', () => {
  it('removes detected boilerplate lines', () => {
    const header = 'StudyForge Notes'
    const pages = Array.from({ length: 6 }, (_, i) => `${header}\nContent on page ${i + 1}`)
    const cleaned = stripBoilerplate(pages)
    for (const page of cleaned) {
      expect(page).not.toContain(header)
    }
  })

  it('returns original pages when no boilerplate', () => {
    const pages = ['Unique A', 'Unique B', 'Unique C', 'Unique D', 'Unique E']
    expect(stripBoilerplate(pages)).toEqual(pages)
  })
})
