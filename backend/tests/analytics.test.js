import { describe, it, expect } from 'vitest'
import { classifyAccuracy } from '../src/services/analytics.service.js'
import { extractJson } from '../src/utils/json.js'
import { parseCitations, buildSourceBlocks } from '../src/rag/pipeline.js'
import { parseContextBlocks, CONTEXT_START, CONTEXT_END } from '../src/ai/prompts.js'

describe('classifyAccuracy', () => {
  it('classifies below 60 as weak', () => {
    expect(classifyAccuracy(0)).toBe('weak')
    expect(classifyAccuracy(59.9)).toBe('weak')
  })

  it('classifies 60-79 as needs_practice', () => {
    expect(classifyAccuracy(60)).toBe('needs_practice')
    expect(classifyAccuracy(70)).toBe('needs_practice')
    expect(classifyAccuracy(79.9)).toBe('needs_practice')
  })

  it('classifies 80+ as strong', () => {
    expect(classifyAccuracy(80)).toBe('strong')
    expect(classifyAccuracy(100)).toBe('strong')
  })
})

describe('extractJson', () => {
  it('parses plain JSON', () => {
    const data = { a: 1 }
    expect(extractJson(JSON.stringify(data))).toEqual(data)
  })

  it('parses JSON inside markdown fences', () => {
    const input = '```json\n{"key": "value"}\n```'
    expect(extractJson(input)).toEqual({ key: 'value' })
  })

  it('parses JSON with surrounding text', () => {
    const input = 'Here is the result: {"x": 42} and more text'
    expect(extractJson(input)).toEqual({ x: 42 })
  })

  it('throws on empty string', () => {
    expect(() => extractJson('')).toThrow()
  })

  it('throws on text with no JSON', () => {
    expect(() => extractJson('no json here')).toThrow()
  })
})

describe('parseContextBlocks', () => {
  it('extracts numbered context blocks from system prompt', () => {
    const system = `Rules...
${CONTEXT_START}
[1] Notes.pdf | Page 12
Supervised learning uses labeled data.
[2] Chapter3.pdf | Page 5
Gradient descent optimizes weights.
${CONTEXT_END}`
    const blocks = parseContextBlocks(system)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].label).toBe('Notes.pdf')
    expect(blocks[0].pageNumber).toBe(12)
    expect(blocks[1].content).toContain('Gradient descent')
  })

  it('returns empty array when no context section', () => {
    expect(parseContextBlocks('No context here')).toEqual([])
  })
})

describe('parseCitations', () => {
  const blocks = [
    { index: 1, documentId: 'd1', documentName: 'A.pdf', pageNumber: 1, content: 'Content A' },
    { index: 2, documentId: 'd2', documentName: 'B.pdf', pageNumber: 5, content: 'Content B' }
  ]

  it('extracts cited block numbers', () => {
    const answer = 'According to your material [1], this is true. Also [2] supports it.'
    const citations = parseCitations(answer, blocks)
    expect(citations).toHaveLength(2)
    expect(citations[0].documentName).toBe('A.pdf')
    expect(citations[1].pageNumber).toBe(5)
  })

  it('returns first block as implicit citation when none found', () => {
    const citations = parseCitations('No citations here', blocks)
    expect(citations).toHaveLength(1)
    expect(citations[0].documentName).toBe('A.pdf')
  })
})

describe('buildSourceBlocks', () => {
  it('creates numbered source blocks', () => {
    const chunks = [{ chunkId: 'c1', documentId: 'd1', documentName: 'A.pdf', pageNumber: 1, content: 'text' }]
    const blocks = buildSourceBlocks(chunks)
    expect(blocks[0].index).toBe(1)
    expect(blocks[0].documentId).toBe('d1')
  })
})
