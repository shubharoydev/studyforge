import { prisma } from '../db/prisma.js'

const WEAK_THRESHOLD = 60
const STRONG_THRESHOLD = 80

function classifyAccuracy(accuracy) {
  if (accuracy < WEAK_THRESHOLD) return 'weak'
  if (accuracy >= STRONG_THRESHOLD) return 'strong'
  return 'needs_practice'
}

export async function getAnalytics(userId) {
  const documentCount = await prisma.document.count({ where: { userId } })
  const conversationCount = await prisma.conversation.count({ where: { userId } })
  const quizCount = await prisma.quiz.count({ where: { userId } })

  const recentAttempts = await prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { percentage: true, createdAt: true, score: true, totalQuestions: true }
  })

  const totalAttempts = recentAttempts.length
  const overallAccuracy = totalAttempts > 0
    ? Math.round(recentAttempts.reduce((s, a) => s + a.percentage, 0) / totalAttempts * 10) / 10
    : 0

  const recentAvg = recentAttempts.length > 0
    ? Math.round(recentAttempts.slice(0, 5).reduce((s, a) => s + a.percentage, 0) / Math.min(5, recentAttempts.length) * 10) / 10
    : 0
  const olderAvg = recentAttempts.length > 5
    ? Math.round(recentAttempts.slice(5).reduce((s, a) => s + a.percentage, 0) / recentAttempts.slice(5).length * 10) / 10
    : recentAvg

  let improvementTrend = 'stable'
  let trendDelta = 0
  if (totalAttempts >= 4) {
    trendDelta = Math.round((recentAvg - olderAvg) * 10) / 10
    if (trendDelta > 5) improvementTrend = 'improving'
    else if (trendDelta < -5) improvementTrend = 'declining'
  }

  const topicRows = await prisma.userTopicProgress.findMany({
    where: { userId },
    include: { topic: true },
    orderBy: { accuracy: 'asc' }
  })

  const topicStats = topicRows.map((t) => ({
    name: t.topic.name,
    correct: t.correct,
    total: t.total,
    accuracy: t.accuracy,
    classification: classifyAccuracy(t.accuracy),
    lastPracticedAt: t.lastPracticedAt
  }))

  const weakTopics = topicStats.filter((t) => t.classification === 'weak')
  const strongTopics = topicStats.filter((t) => t.classification === 'strong')
  const needsPractice = topicStats.filter((t) => t.classification === 'needs_practice')

  const recentDocs = await prisma.document.findMany({
    where: { userId, status: 'READY' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, createdAt: true }
  })

  const recentQuizzes = await prisma.quiz.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, createdAt: true }
  })

  const activity = [
    ...recentDocs.map((d) => ({ type: 'document', id: d.id, name: d.name, date: d.createdAt })),
    ...recentQuizzes.map((q) => ({ type: 'quiz', id: q.id, name: q.title, date: q.createdAt }))
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  return {
    overview: {
      documentCount,
      conversationCount,
      quizCount,
      totalAttempts,
      overallAccuracy,
      recentAverage: recentAvg,
      improvementTrend,
      trendDelta
    },
    topicStats,
    weakTopics,
    strongTopics,
    needsPractice,
    recentActivity: activity
  }
}
