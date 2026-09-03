import { describe, it, expect } from 'vitest'
import { generatedQuizSchema, questionSchema, documentSummarySchema, validate } from '../src/schemas/quiz.js'

describe('quiz schema validation', () => {
  const validQuestion = {
    question: 'What is supervised learning?',
    options: ['Learning with labels', 'Learning without labels', 'Reinforcement', 'Clustering'],
    correctIndex: 0,
    explanation: 'Supervised learning uses labeled training data.',
    topic: 'Machine Learning',
    difficulty: 'MEDIUM'
  }

  it('accepts a valid quiz', () => {
    const data = { title: 'ML Quiz', questions: [validQuestion] }
    const result = validate(generatedQuizSchema, data)
    expect(result.error).toBeNull()
    expect(result.data.questions).toHaveLength(1)
  })

  it('rejects quiz with no questions', () => {
    const result = validate(generatedQuizSchema, { title: 'Q', questions: [] })
    expect(result.error).toBeTruthy()
  })

  it('rejects question with wrong number of options', () => {
    const q = { ...validQuestion, options: ['A', 'B', 'C'] }
    const result = validate(questionSchema, q)
    expect(result.error).toBeTruthy()
  })

  it('rejects question with correctIndex out of bounds', () => {
    const q = { ...validQuestion, correctIndex: 4 }
    const result = validate(questionSchema, q)
    expect(result.error).toBeTruthy()
  })

  it('rejects invalid difficulty', () => {
    const q = { ...validQuestion, difficulty: 'EXTREME' }
    const result = validate(questionSchema, q)
    expect(result.error).toBeTruthy()
  })

  it('accepts question with optional source fields', () => {
    const q = { ...validQuestion, sourcePage: 5, sourceQuote: 'A quote' }
    const result = validate(questionSchema, q)
    expect(result.error).toBeNull()
  })
})

describe('document summary schema', () => {
  it('accepts a valid summary', () => {
    const data = {
      overview: 'This document covers machine learning fundamentals.',
      keyConcepts: ['Supervised', 'Unsupervised'],
      definitions: [{ term: 'ML', definition: 'Machine Learning' }],
      formulas: [],
      examPoints: ['Know the difference between supervised and unsupervised.'],
      suggestedQuestions: ['Explain supervised learning']
    }
    const result = validate(documentSummarySchema, data)
    expect(result.error).toBeNull()
  })

  it('accepts empty arrays', () => {
    const data = {
      overview: 'A brief overview of the material.',
      keyConcepts: [],
      definitions: [],
      formulas: [],
      examPoints: [],
      suggestedQuestions: []
    }
    expect(validate(documentSummarySchema, data).error).toBeNull()
  })

  it('rejects missing overview', () => {
    const result = validate(documentSummarySchema, { keyConcepts: [], definitions: [], formulas: [], examPoints: [], suggestedQuestions: [] })
    expect(result.error).toBeTruthy()
  })
})
