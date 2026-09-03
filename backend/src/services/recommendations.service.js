import { prisma } from '../db/prisma.js'
import { childLogger } from '../utils/logger.js'

const log = childLogger({ module: 'recommendations' })

export async function getRecommendations(userId) {
  const topicProgress = await prisma.userTopicProgress.findMany({
    where: { userId },
    include: { topic: true },
    orderBy: { accuracy: 'asc' }
  })

  const recentAttempts = await prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { quizId: true, percentage: true, createdAt: true }
  })

  const docs = await prisma.document.findMany({
    where: { userId, status: 'READY' },
    select: { id: true, name: true, createdAt: true }
  })

  const recs = []

  // Weak topics need revision
  for (const tp of topicProgress) {
    if (tp.accuracy < 60 && tp.total >= 2) {
      recs.push({
        type: 'revise_topic',
        title: `Revise ${tp.topic.name}`,
        reason: `Your accuracy on ${tp.topic.name} is ${Math.round(tp.accuracy)}% across ${tp.total} questions. Reviewing the core concepts can help improve this.`,
        actionUrl: `/chat?topic=${encodeURIComponent(tp.topic.name)}`,
        priority: Math.round((60 - tp.accuracy) * 10 + 50)
      })
    }
  }

  // Topics with few practice attempts
  for (const tp of topicProgress) {
    if (tp.total < 3 && tp.accuracy >= 40) {
      recs.push({
        type: 'practice_topic',
        title: `Practice more on ${tp.topic.name}`,
        reason: `You've only answered ${tp.total} question(s) on ${tp.topic.name}. More practice builds confidence.`,
        actionUrl: `/chat?topic=${encodeURIComponent(tp.topic.name)}`,
        priority: 30
      })
    }
  }

  // Documents without quizzes
  const quizzedDocIds = new Set(recentAttempts.map((a) => a.quizId))
  for (const doc of docs) {
    const hasQuiz = await prisma.quiz.findFirst({ where: { userId, documentId: doc.id } })
    if (!hasQuiz) {
      recs.push({
        type: 'quiz_from_doc',
        title: `Generate a quiz from "${doc.name}"`,
        reason: `"${doc.name}" hasn't been used for a quiz yet. Testing yourself is one of the best ways to retain information.`,
        actionUrl: `/quizzes?generate=${doc.id}`,
        priority: 25
      })
    }
  }

  // No recent activity
  if (recentAttempts.length === 0 && docs.length > 0) {
    recs.push({
      type: 'get_started',
      title: 'Take your first quiz',
      reason: 'Quizzes help identify what you know and what you need to review. Try generating one from a document.',
      actionUrl: '/quizzes',
      priority: 60
    })
  }

  if (docs.length === 0) {
    recs.push({
      type: 'upload_doc',
      title: 'Upload your first document',
      reason: 'StudyForge works best with your own study material. Upload a PDF to get started.',
      actionUrl: '/documents',
      priority: 100
    })
  }

  recs.sort((a, b) => b.priority - a.priority)
  return recs.slice(0, 8)
}
