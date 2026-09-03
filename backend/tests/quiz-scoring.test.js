import { describe, it, expect } from 'vitest'

const THRESHOLD_WEAK = 60
const THRESHOLD_STRONG = 80

function classifyAccuracy(accuracy) {
  if (accuracy < THRESHOLD_WEAK) return 'weak'
  if (accuracy >= THRESHOLD_STRONG) return 'strong'
  return 'needs_practice'
}

function computeTopicStats(rows) {
  return rows
    .map((r) => ({
      name: r.name,
      accuracy: r.accuracy,
      classification: classifyAccuracy(r.accuracy)
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
}

function computeTrend(perc) {
  const n = perc.length
  if (n < 4) return { direction: 'insufficient', delta: 0 }
  const mid = Math.ceil(n / 2)
  const recent = perc.slice(0, mid)
  const older = perc.slice(mid)
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length
  const olderAvg = older.reduce((s, v) => s + v, 0) / older.length
  const delta = Math.round((recentAvg - olderAvg) * 10) / 10
  if (delta > 5) return { direction: 'improving', delta }
  if (delta < -5) return { direction: 'declining', delta }
  return { direction: 'stable', delta }
}

describe('topic stats computation', () => {
  it('sorts topics by accuracy ascending', () => {
    const rows = [
      { name: 'Strong', accuracy: 90 },
      { name: 'Weak', accuracy: 30 },
      { name: 'Medium', accuracy: 70 }
    ]
    const stats = computeTopicStats(rows)
    expect(stats[0].name).toBe('Weak')
    expect(stats[2].name).toBe('Strong')
  })

  it('classifies all categories correctly', () => {
    const stats = computeTopicStats([
      { name: 'A', accuracy: 30 },
      { name: 'B', accuracy: 65 },
      { name: 'C', accuracy: 85 }
    ])
    expect(stats[0].classification).toBe('weak')
    expect(stats[1].classification).toBe('needs_practice')
    expect(stats[2].classification).toBe('strong')
  })
})

describe('trend computation', () => {
  it('detects improving trend', () => {
    const trend = computeTrend([90, 88, 85, 82, 60, 55, 50, 45])
    expect(trend.direction).toBe('improving')
    expect(trend.delta).toBeGreaterThan(0)
  })

  it('detects declining trend', () => {
    const trend = computeTrend([40, 42, 45, 50, 80, 85, 90, 95])
    expect(trend.direction).toBe('declining')
  })

  it('returns insufficient data for small samples', () => {
    const trend = computeTrend([60, 65])
    expect(trend.direction).toBe('insufficient')
  })

  it('returns stable for small changes', () => {
    const trend = computeTrend([72, 74, 73, 71, 68, 70, 69, 71])
    expect(trend.direction).toBe('stable')
  })
})
