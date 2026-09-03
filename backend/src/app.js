import Fastify from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from './config/env.js'
import { authenticate } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { providerStatus } from './ai/provider.factory.js'
import { resumeStuckDocuments } from './documents/processor.js'

import {
  registerHandler,
  loginHandler,
  meHandler,
  updateMeHandler,
  changePasswordHandler
} from './routes/auth.routes.js'

import {
  listDocumentsHandler,
  uploadHandler,
  getDocumentHandler,
  deleteDocumentHandler,
  summaryHandler
} from './routes/documents.routes.js'

import {
  chatHandler,
  chatStreamHandler,
  listConversationsHandler,
  getConversationHandler,
  deleteConversationHandler
} from './routes/chat.routes.js'

import {
  listQuizzesHandler,
  generateQuizHandler,
  getQuizHandler,
  attemptQuizHandler
} from './routes/quizzes.routes.js'

import { analyticsHandler, recommendationsHandler } from './routes/analytics.routes.js'
import swaggerConfig from './plugins/swagger.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      formatters: { level(label) { return { level: label } } },
      redact: { paths: ['req.headers.authorization'], censor: '[REDACTED]' }
    },
    bodyLimit: 5 * 1024 * 1024,
    genReqId: () => crypto.randomUUID()
  })

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
  })

  await app.register(multipart, {
    limits: { fileSize: env.maxUploadBytes, files: 1 }
  })

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute'
  })

  await app.register(sensible)

  await app.register(swagger, swaggerConfig())
  await app.register(swaggerUi, { routePrefix: '/docs' })

  app.decorate('authenticate', authenticate)
  app.setErrorHandler(errorHandler)
  app.setNotFoundHandler(notFoundHandler)

  // Health check
  app.get('/api/health', async () => {
    const providers = providerStatus()
    return {
      status: 'ok',
      uptime: process.uptime(),
      providers,
      timestamp: new Date().toISOString()
    }
  })

  // Public auth routes
  app.post('/api/auth/register', { config: { rateLimit: { max: env.RATE_LIMIT_AUTH_MAX, timeWindow: '1 minute' } } }, registerHandler)
  app.post('/api/auth/login', { config: { rateLimit: { max: env.RATE_LIMIT_AUTH_MAX, timeWindow: '1 minute' } } }, loginHandler)

  // Protected auth routes
  app.register(async (authed) => {
    authed.addHook('preHandler', authenticate)
    authed.get('/api/auth/me', meHandler)
    authed.patch('/api/auth/me', updateMeHandler)
    authed.patch('/api/auth/password', changePasswordHandler)
  })

  // Protected document routes
  app.register(async (docs) => {
    docs.addHook('preHandler', authenticate)
    docs.get('/api/documents', listDocumentsHandler)
    docs.post('/api/documents/upload', uploadHandler)
    docs.get('/api/documents/:id', getDocumentHandler)
    docs.delete('/api/documents/:id', deleteDocumentHandler)
    docs.post('/api/documents/:id/summary', summaryHandler)
  })

  // Protected file serving for local storage (ownership enforced)
  app.register(async (files) => {
    files.addHook('preHandler', authenticate)
    files.get('/files/:userId/:filename', async (request, reply) => {
      if (request.params.userId !== request.user.id) {
        return reply.code(403).send({ error: 'FORBIDDEN', message: 'You do not have access to this file' })
      }
      const filename = String(request.params.filename).replace(/[^a-zA-Z0-9._-]/g, '')
      if (!filename) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid filename' })
      const base = path.resolve(env.STORAGE_LOCAL_DIR)
      const filePath = path.resolve(base, request.params.userId, filename)
      if (!filePath.startsWith(base)) {
        return reply.code(403).send({ error: 'FORBIDDEN', message: 'Invalid file path' })
      }
      try {
        const data = await fs.readFile(filePath)
        reply.header('Content-Type', 'application/pdf')
        reply.header('Content-Disposition', `inline; filename="${filename}"`)
        return reply.send(data)
      } catch {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'File not found' })
      }
    })
  })

  // Protected chat routes
  app.register(async (chat) => {
    chat.addHook('preHandler', authenticate)
    chat.post('/api/chat', { config: { rateLimit: { max: env.RATE_LIMIT_AI_MAX, timeWindow: '1 minute' } } }, chatHandler)
    chat.post('/api/chat/stream', { config: { rateLimit: { max: env.RATE_LIMIT_AI_MAX, timeWindow: '1 minute' } } }, chatStreamHandler)
    chat.get('/api/conversations', listConversationsHandler)
    chat.get('/api/conversations/:id', getConversationHandler)
    chat.delete('/api/conversations/:id', deleteConversationHandler)
  })

  // Protected quiz routes
  app.register(async (quizzes) => {
    quizzes.addHook('preHandler', authenticate)
    quizzes.get('/api/quizzes', listQuizzesHandler)
    quizzes.post('/api/quizzes/generate', { config: { rateLimit: { max: env.RATE_LIMIT_AI_MAX, timeWindow: '1 minute' } } }, generateQuizHandler)
    quizzes.get('/api/quizzes/:id', getQuizHandler)
    quizzes.post('/api/quizzes/:id/attempt', attemptQuizHandler)
  })

  // Protected analytics routes
  app.register(async (analytics) => {
    analytics.addHook('preHandler', authenticate)
    analytics.get('/api/analytics', analyticsHandler)
    analytics.get('/api/recommendations', recommendationsHandler)
  })

  // Process any stuck documents on startup
  await resumeStuckDocuments().catch((err) => {
    app.log.warn({ err: String(err) }, 'failed to resume stuck documents')
  })

  return app
}
