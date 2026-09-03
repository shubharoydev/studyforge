import { z } from 'zod'

const difficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD'])

export const questionSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(5).max(1500),
  topic: z.string().min(1).max(120),
  difficulty: difficultyEnum.default('MEDIUM'),
  sourcePage: z.number().int().positive().nullable().optional(),
  sourceQuote: z.string().max(1000).nullable().optional()
})

export const generatedQuizSchema = z.object({
  title: z.string().min(1).max(150),
  questions: z.array(questionSchema).min(1).max(20)
})

export const generateQuizRequestSchema = z.object({
  documentId: z.string().min(1).optional(),
  topic: z.string().min(1).max(60).optional(),
  count: z.coerce.number().int().min(1).max(50).default(5),
  difficulty: difficultyEnum.default('MEDIUM')
})

export const quizAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedIndex: z.number().int().min(0).max(3)
      })
    )
    .min(1),
  durationSeconds: z.number().int().positive().max(7200).optional()
})

export const documentSummarySchema = z.object({
  overview: z.string().min(10),
  keyConcepts: z.array(z.string()).min(0),
  definitions: z
    .array(
      z.object({
        term: z.string().min(1),
        definition: z.string().min(1)
      })
    )
    .min(0),
  formulas: z.array(z.string()).min(0),
  examPoints: z.array(z.string()).min(0),
  suggestedQuestions: z.array(z.string()).min(0)
})

export function validate(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { error: msg, data: null }
  }
  return { error: null, data: result.data }
}
