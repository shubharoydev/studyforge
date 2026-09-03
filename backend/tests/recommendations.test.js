import { describe, it, expect } from 'vitest'

function buildRecommendations({ topicStats = [], attempts = [], docs = [] } = {}) {
  const recs = []

  for (const tp of topicStats) {
    if (tp.accuracy < 60 && tp.total >= 2) {
      recs.push({
        type: 'revise_topic',
        title: `Revise ${tp.name}`,
        reason: `Your accuracy on ${tp.name} is ${Math.round(tp.accuracy)}% across ${tp.total} questions.`,
        actionUrl: `/chat?topic=${encodeURIComponent(tp.name)}`,
        priority: Math.round((60 - tp.accuracy) * 10 + 50)
      })
    }
  }

  for (const tp of topicStats) {
    if (tp.total < 3 && tp.accuracy >= 40) {
      recs.push({
        type: 'practice_topic',
        title: `Practice ${tp.name}`,
        reason: `Only ${tp.total} question(s) so far.`,
        actionUrl: `/chat?topic=${encodeURIComponent(tp.name)}`,
        priority: 30
      })
    }
  }

  for (const doc of docs) {
    if (!doc.hasQuiz) {
      recs.push({
        type: 'quiz_from_doc',
        title: `Quiz from "${doc.name}"`,
        reason: `No quiz generated from this document yet.`,
        actionUrl: `/quizzes?generate=${doc.id}`,
        priority: 25
      })
    }
  }

  if (attempts.length === 0 && docs.length > 0) {
    recs.push({ type: 'get_started', title: 'Take your first quiz', reason: 'Get started!', actionUrl: '/quizzes', priority: 60 })
  }
  if (docs.length === 0) {
    recs.push({ type: 'upload_doc', title: 'Upload a document', reason: 'Start by uploading material.', actionUrl: '/documents', priority: 100 })
  }

  recs.sort((a, b) => b.priority - a.priority)
  return recs.slice(0, 8)
}

describe('recommendation engine', () => {
  it('prioritizes weak topics with reason containing accuracy', () => {
    const recs = buildRecommendations({
      topicStats: [{ name: 'Gradient Descent', accuracy: 35, total: 10 }]
    })
    expect(recs.length).toBeGreaterThanOrEqual(1)
    expect(recs[0].title).toContain('Gradient Descent')
    expect(recs[0].reason).toContain('35%')
  })

  it('recommends upload when no docs', () => {
    const recs = buildRecommendations({ docs: [] })
    expect(recs.some((r) => r.type === 'upload_doc')).toBe(true)
  })

  it('recommends quiz from unquizzed documents', () => {
    const recs = buildRecommendations({
      docs: [{ id: 'd1', name: 'Notes.pdf', hasQuiz: false }]
    })
    expect(recs.some((r) => r.type === 'quiz_from_doc')).toBe(true)
  })

  it('does not recommend quiz for already quizzed docs', () => {
    const recs = buildRecommendations({
      docs: [{ id: 'd1', name: 'Notes.pdf', hasQuiz: true }]
    })
    expect(recs.some((r) => r.type === 'quiz_from_doc')).toBe(false)
  })

  it('recommends practice for low-attempt topics', () => {
    const recs = buildRecommendations({
      topicStats: [{ name: 'Neural Nets', accuracy: 75, total: 2 }]
    })
    expect(recs.some((r) => r.type === 'practice_topic' && r.title.includes('Neural Nets'))).toBe(true)
  })

  it('sorts by priority descending', () => {
    const recs = buildRecommendations({
      topicStats: [
        { name: 'Weak', accuracy: 20, total: 10 },
        { name: 'Mid', accuracy: 70, total: 2 }
      ],
      docs: [{ id: 'd1', name: 'N.pdf', hasQuiz: false }]
    })
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].priority).toBeLessThanOrEqual(recs[i - 1].priority)
    }
  })
})
