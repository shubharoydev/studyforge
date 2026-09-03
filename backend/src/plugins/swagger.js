import { providerStatus } from '../ai/provider.factory.js'

export default function swaggerConfig() {
  return {
    openapi: {
      info: {
        title: 'StudyForge AI API',
        description: 'An evidence-backed AI learning and study assistant API',
        version: '1.0.0'
      },
      servers: [{ url: '/api', description: 'API Server' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Authentication and user management' },
        { name: 'Documents', description: 'Document upload, processing, and management' },
        { name: 'Chat', description: 'AI conversation and RAG-powered Q&A' },
        { name: 'Quizzes', description: 'Quiz generation and assessment' },
        { name: 'Analytics', description: 'Learning analytics and insights' },
        { name: 'System', description: 'Health and status' }
      ]
    }
  }
}
