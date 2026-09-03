import pino from 'pino'
import { env } from '../config/env.js'

export const logger = pino({
  level: env.LOG_LEVEL,
  base: undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash'],
    censor: '[REDACTED]'
  },
  formatters: {
    level(label) {
      return { level: label }
    }
  }
})

export function childLogger(bindings) {
  return logger.child(bindings)
}
