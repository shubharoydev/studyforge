import { env } from './config/env.js'
import { buildApp } from './app.js'
import { logger } from './utils/logger.js'

const PORT = env.PORT
const HOST = env.HOST

async function start() {
  const app = await buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    logger.info({ port: PORT, host: HOST }, `StudyForge API running`)
    logger.info({ url: `http://${HOST}:${PORT}/docs` }, 'API docs available')
  } catch (err) {
    logger.error({ err: String(err) }, 'failed to start server')
    process.exit(1)
  }

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down gracefully')
    await app.close()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start()
