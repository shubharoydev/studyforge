import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')
  // eslint-disable-next-line no-console
  console.log('pgvector extension is ready')
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to enable pgvector extension:', err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
