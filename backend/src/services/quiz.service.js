import { prisma } from '../db/prisma.js'
import { getLLMProvider } from '../ai/provider.factory.js'
import { buildQuizSystemPrompt, buildQuizUserPrompt, buildContextSection } from '../ai/prompts.js'
import { generatedQuizSchema, validate } from '../schemas/quiz.js'
import { extractJson } from '../utils/json.js'
import { notFound, badRequest, aiGenerationFailed, documentNotReady } from '../utils/errors.js'
import { childLogger } from '../utils/logger.js'

const log = childLogger({ module: 'quiz-service' })

async function gatherChunks(userId, documentId, topic) {
  if (documentId) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } })
    if (!doc || doc.userId !== userId) throw notFound('Document not found')
    if (doc.status !== 'READY') throw documentNotReady()
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      take: 18
    })
    return {
      blocks: chunks.map((c, i) => ({
        index: i + 1,
        documentName: doc.name,
        pageNumber: c.pageNumber,
        content: String(c.content)
      })),
      defaultTitle: doc.name.replace(/\.pdf$/i, '')
    }
  }

  if (topic) {
    const { retrieve } = await import('../rag/retriever.js')
    const chunks = await retrieve(userId, topic, { topK: 14 })
    if (chunks.length === 0) throw badRequest(`No content found matching the topic "${topic}". Try a different topic or select a document.`)
    return {
      blocks: chunks.map((c, i) => ({
        index: i + 1,
        documentName: c.documentName,
        pageNumber: c.pageNumber,
        content: c.content
      })),
      defaultTitle: topic
    }
  }

  const docs = await prisma.document.findMany({
    where: { userId, status: 'READY' },
    orderBy: { createdAt: 'desc' },
    take: 3
  })
  if (docs.length === 0) throw badRequest('No processed documents found. Upload a document first.')

  const chunks = await prisma.documentChunk.findMany({
    where: { documentId: { in: docs.map((d) => d.id) } },
    orderBy: { chunkIndex: 'asc' },
    take: 18
  })
  return {
    blocks: chunks.map((c, i) => ({
      index: i + 1,
      documentName: docs.find((d) => d.id === c.documentId)?.name ?? 'Unknown',
      pageNumber: c.pageNumber,
      content: String(c.content)
    })),
    defaultTitle: 'Study Material'
  }
}

export async function generateQuiz(userId, { documentId, topic, count, difficulty }) {
  log.info({ userId, documentId, topic, count, difficulty }, 'generating quiz')
  const { blocks, defaultTitle } = await gatherChunks(userId, documentId, topic)
  log.info({ blocksCount: blocks.length, defaultTitle }, 'chunks gathered')
  const llm = getLLMProvider()

  let parsed = null
  const maxAttempts = llm.isMock ? 1 : 3
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    log.info({ attempt, maxAttempts }, 'LLM generation attempt')
    const raw = await llm.complete({
      messages: [
        { role: 'system', content: buildQuizSystemPrompt() },
        { role: 'user', content: buildQuizUserPrompt({ blocks, count, difficulty, topic }) }
      ],
      temperature: llm.isMock ? 0 : 0.2,
      jsonMode: true
    })
    log.info({ rawLength: raw?.length }, 'LLM response received')
    let candidate
    try {
      candidate = extractJson(raw)
      log.info({ candidateKeys: Object.keys(candidate) }, 'JSON extracted')
    } catch (e) {
      log.warn({ attempt, error: String(e) }, 'JSON extraction failed')
      continue
    }
    const result = validate(generatedQuizSchema, candidate)
    if (result.error) {
      log.warn({ attempt, error: result.error }, 'quiz schema validation failed')
      continue
    }
    parsed = { ...result.data, title: result.data.title || `${topic || defaultTitle} Quiz` }
    log.info({ parsedQuestions: parsed.questions?.length }, 'quiz parsed successfully')
    break
  }

  if (!parsed) {
    log.error('failed to generate valid quiz after all attempts')
    throw aiGenerationFailed('The AI could not generate a valid quiz from this content. Try different settings or a different document.')
  }

  const quiz = await prisma.$transaction(async (tx) => {
    const q = await tx.quiz.create({
      data: {
        userId,
        documentId: documentId || null,
        title: parsed.title,
        difficulty
      }
    })
    log.info({ quizId: q.id }, 'quiz created in database')
    for (let i = 0; i < parsed.questions.length; i++) {
      const raw = parsed.questions[i]
      await tx.question.create({
        data: {
          quizId: q.id,
          order: i + 1,
          question: raw.question,
          options: raw.options,
          correctIndex: raw.correctIndex,
          explanation: raw.explanation,
          topic: raw.topic,
          difficulty: raw.difficulty ?? difficulty,
          sourcePage: raw.sourcePage ?? null,
          sourceQuote: raw.sourceQuote ?? null
        }
      })
    }
    log.info({ questionCount: parsed.questions.length }, 'questions created')
    return q
  })

  const sanitized = sanitizeQuiz(quiz, false)
  log.info({ sanitizedQuizId: sanitized.id }, 'quiz sanitized and ready to return')
  return sanitized
}

function sanitizeQuiz(quiz, includeAnswers = false) {
  return {
    id: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty,
    documentId: quiz.documentId,
    createdAt: quiz.createdAt,
    questions: undefined,
    questionCount: quiz.questions?.length
  }
}

export async function getQuiz(userId, quizId, { includeAnswers = false, attemptId = null } = {}) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
  if (!quiz || quiz.userId !== userId) throw notFound('Quiz not found')
  const questions = await prisma.question.findMany({ where: { quizId }, orderBy: { order: 'asc' } })
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  let answerLookup = {}
  if (attemptId) {
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } })
    if (attempt && attempt.quizId === quizId && attempt.userId === userId) {
      const answers = await prisma.quizAnswer.findMany({ where: { attemptId } })
      for (const a of answers) answerLookup[a.questionId] = a.selectedIndex
    }
  }

  return {
    id: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty,
    documentId: quiz.documentId,
    createdAt: quiz.createdAt,
    attempts,
    questions: questions.map((q) => ({
      id: q.id,
      order: q.order,
      question: q.question,
      options: q.options,
      topic: q.topic,
      difficulty: q.difficulty,
      sourcePage: q.sourcePage,
      sourceQuote: q.sourceQuote,
      ...(includeAnswers ? { correctIndex: q.correctIndex, explanation: q.explanation } : {}),
      userSelectedIndex: answerLookup[q.id] ?? null
    }))
  }
}

export async function listQuizzes(userId) {
  const quizzes = await prisma.quiz.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  const result = []
  for (const q of quizzes) {
    const questionCount = await prisma.question.count({ where: { quizId: q.id } })
    const bestAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: q.id, userId },
      orderBy: { percentage: 'desc' }
    })
    const attemptCount = await prisma.quizAttempt.count({ where: { quizId: q.id, userId } })
    result.push({
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      documentId: q.documentId,
      createdAt: q.createdAt,
      questionCount,
      attemptCount,
      bestScore: bestAttempt?.percentage ?? null
    })
  }
  return result
}

export async function submitAttempt(userId, quizId, { answers, durationSeconds }) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
  if (!quiz || quiz.userId !== userId) throw notFound('Quiz not found')

  const questions = await prisma.question.findMany({ where: { quizId }, orderBy: { order: 'asc' } })
  const qMap = new Map(questions.map((q) => [q.id, q]))

  const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedIndex]))

  let score = 0
  const perQuestion = []
  for (const q of questions) {
    const selected = answerMap.get(q.id)
    const isCorrect = selected === q.correctIndex
    if (isCorrect) score++
    perQuestion.push({ questionId: q.id, selectedIndex: selected ?? -1, isCorrect })
  }

  const totalQuestions = questions.length
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100 * 10) / 10 : 0

  const attempt = await prisma.$transaction(async (tx) => {
    const a = await tx.quizAttempt.create({
      data: { quizId, userId, score, totalQuestions, percentage, durationSeconds: durationSeconds ?? null }
    })
    for (const pq of perQuestion) {
      await tx.quizAnswer.create({
        data: { attemptId: a.id, questionId: pq.questionId, selectedIndex: pq.selectedIndex, isCorrect: pq.isCorrect }
      })
    }

    for (const pq of perQuestion) {
      const q = qMap.get(pq.questionId)
      if (!q) continue
      const topicName = q.topic
      const normalizedName = topicName.toLowerCase().trim()

      const topic = await tx.topic.upsert({
        where: { userId_normalizedName: { userId, normalizedName } },
        update: {},
        create: { userId, name: topicName, normalizedName }
      })

      await tx.userTopicProgress.upsert({
        where: { userId_topicId: { userId, topicId: topic.id } },
        update: {
          correct: { increment: pq.isCorrect ? 1 : 0 },
          total: { increment: 1 },
          lastPracticedAt: new Date()
        },
        create: {
          userId,
          topicId: topic.id,
          correct: pq.isCorrect ? 1 : 0,
          total: 1,
          accuracy: pq.isCorrect ? 100 : 0,
          lastPracticedAt: new Date()
        }
      })
    }

    return a
  })

  await recalculateTopicAccuracies(userId, [...new Set(questions.map((q) => q.topic))])

  return {
    attemptId: attempt.id,
    score,
    totalQuestions,
    percentage,
    durationSeconds: durationSeconds ?? null,
    createdAt: attempt.createdAt,
    questions: questions.map((q) => ({
      id: q.id,
      order: q.order,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      topic: q.topic,
      difficulty: q.difficulty,
      sourcePage: q.sourcePage,
      sourceQuote: q.sourceQuote,
      userSelectedIndex: answerMap.get(q.id) ?? null,
      isCorrect: answerMap.get(q.id) === q.correctIndex
    }))
  }
}

async function recalculateTopicAccuracies(userId, topicNames) {
  for (const topicName of topicNames) {
    const rows = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN qa."isCorrect" THEN 1 ELSE 0 END), 0)::int AS "correct",
        COUNT(*)::int AS "total"
      FROM "QuizAnswer" qa
      JOIN "Question" q ON q."id" = qa."questionId"
      JOIN "QuizAttempt" qa2 ON qa2."id" = qa."attemptId"
      WHERE qa2."userId" = ${userId}
        AND q."topic" = ${topicName}
    `
    const { correct, total } = rows[0] ?? { correct: 0, total: 0 }
    const accuracy = total > 0 ? Math.round((correct / total) * 100 * 10) / 10 : 0
    const normalizedName = topicName.toLowerCase().trim()
    const topic = await prisma.topic.upsert({
      where: { userId_normalizedName: { userId, normalizedName } },
      update: {},
      create: { userId, name: topicName, normalizedName }
    })
    await prisma.userTopicProgress.update({
      where: { userId_topicId: { userId, topicId: topic.id } },
      data: { correct, total, accuracy, lastPracticedAt: new Date() }
    }).catch(() =>
      prisma.userTopicProgress.create({
        data: { userId, topicId: topic.id, correct, total, accuracy, lastPracticedAt: new Date() }
      })
    )
  }
}
