import { AppError, userSafeMessage } from '../utils/errors.js'
import { env } from '../config/env.js'
import { childLogger } from '../utils/logger.js'

const log = childLogger({ module: 'error-handler' })

export function errorHandler(err, request, reply) {
  if (err instanceof AppError) {
    return reply.code(err.statusCode).send({
      error: err.code,
      message: err.message,
      details: err.details
    })
  }

  if (err.name === 'SyntaxError' && 'body' in err) {
    return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid JSON in request body' })
  }

  const statusCode = err.statusCode || err.status || 500
  log.error({ err: String(err), stack: err.stack, url: request.url, method: request.method }, 'unhandled error')
  reply.code(statusCode).send({
    error: 'INTERNAL_ERROR',
    message: env.isProd ? 'Something went wrong. Please try again.' : String(err)
  })
}

export function notFoundHandler(request, reply) {
  reply.code(404).send({ error: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` })
}
