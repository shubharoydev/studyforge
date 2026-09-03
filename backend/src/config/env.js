import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().default('studyforge-dev-only-secret-change-me-please!'),
  AUTH_TOKEN_TTL: z.string().default('7d'),

  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_AI_MAX: z.coerce.number().int().positive().default(30),

  LLM_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),

  EMBEDDING_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .refine((n) => n <= 1536, { message: 'EMBEDDING_DIMENSIONS cannot exceed the vector column size (1536)' })
    .default(1536),

  STORAGE_DRIVER: z.enum(['local', 'supabase', 'r2']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage/uploads'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default('studyforge-uploads'),
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_REGION: z.string().default('auto'),
  R2_PUBLIC_URL: z.string().url().optional(),

  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(100).default(25)
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`)
  process.exit(1)
}

const raw = parsed.data

const DEV_SECRET = 'studyforge-dev-only-secret-change-me-please!'
if (raw.NODE_ENV === 'production' && raw.AUTH_SECRET === DEV_SECRET) {
  // eslint-disable-next-line no-console
  console.error('AUTH_SECRET must be overridden in production. Refusing to start.')
  process.exit(1)
}
if (raw.LLM_PROVIDER === 'openai' && !raw.LLM_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('LLM_PROVIDER=openai requires LLM_API_KEY. Set it or use LLM_PROVIDER=mock.')
  process.exit(1)
}
if (raw.EMBEDDING_PROVIDER === 'openai' && !raw.EMBEDDING_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('EMBEDDING_PROVIDER=openai requires EMBEDDING_API_KEY. Set it or use EMBEDDING_PROVIDER=mock.')
  process.exit(1)
}
if (raw.STORAGE_DRIVER === 'supabase' && (!raw.SUPABASE_URL || !raw.SUPABASE_SERVICE_KEY)) {
  // eslint-disable-next-line no-console
  console.error('STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_KEY.')
  process.exit(1)
}
if (
  raw.STORAGE_DRIVER === 'r2' &&
  (!raw.R2_ENDPOINT || !raw.R2_ACCESS_KEY_ID || !raw.R2_SECRET_ACCESS_KEY || !raw.R2_BUCKET)
) {
  // eslint-disable-next-line no-console
  console.error(
    'STORAGE_DRIVER=r2 requires R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.'
  )
  process.exit(1)
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  corsOrigins: raw.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  maxUploadBytes: raw.MAX_UPLOAD_MB * 1024 * 1024,
  usingMockAI: raw.LLM_PROVIDER === 'mock' || raw.EMBEDDING_PROVIDER === 'mock'
}
