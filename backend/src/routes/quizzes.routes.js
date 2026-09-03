import { generateQuiz, getQuiz, listQuizzes, submitAttempt } from '../services/quiz.service.js'
import { validate, generateQuizRequestSchema, quizAttemptSchema } from '../schemas/quiz.js'

export async function listQuizzesHandler(request) {
  const quizzes = await listQuizzes(request.user.id)
  return { quizzes }
}

export async function generateQuizHandler(request) {
  request.log.info({ body: request.body }, 'quiz generation request received')
  const { error, data } = validate(generateQuizRequestSchema, request.body)
  if (error) {
    request.log.error({ error, validationError: error }, 'validation failed')
    return { error: 'VALIDATION_ERROR', message: error }
  }
  try {
    request.log.info({ data }, 'validation passed, calling generateQuiz')
    const quiz = await generateQuiz(request.user.id, data)
    request.log.info({ quizId: quiz?.id }, 'quiz generated successfully')
    return { quiz }
  } catch (err) {
    request.log.error({ err: String(err), stack: err.stack }, 'quiz generation failed')
    throw err
  }
}

export async function getQuizHandler(request) {
  const includeAnswers = request.query.review === 'true'
  const attemptId = request.query.attemptId || null
  const quiz = await getQuiz(request.user.id, request.params.id, { includeAnswers, attemptId })
  return { quiz }
}

export async function attemptQuizHandler(request) {
  const { error, data } = validate(quizAttemptSchema, request.body)
  if (error) return { error: 'VALIDATION_ERROR', message: error }
  const result = await submitAttempt(request.user.id, request.params.id, data)
  return result
}
