export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const badRequest = (message, details) => new AppError(message, 400, 'VALIDATION_ERROR', details)
export const unauthorized = (message = 'Authentication required') => new AppError(message, 401, 'UNAUTHORIZED')
export const invalidCredentials = () => new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
export const forbidden = (message = 'You do not have access to this resource') => new AppError(message, 403, 'FORBIDDEN')
export const notFound = (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND')
export const conflict = (message) => new AppError(message, 409, 'CONFLICT')
export const payloadTooLarge = (message) => new AppError(message, 413, 'PAYLOAD_TOO_LARGE')
export const unsupportedMedia = (message) => new AppError(message, 415, 'UNSUPPORTED_MEDIA_TYPE')
export const rateLimited = (message = 'Too many requests. Please slow down.') =>
  new AppError(message, 429, 'RATE_LIMITED')
export const documentParseFailed = (
  message = 'We could not read this PDF. It may be corrupted or password-protected.'
) => new AppError(message, 422, 'DOCUMENT_PARSE_FAILED')
export const documentNotReady = () =>
  new AppError('This document is still processing. Please try again once it is ready.', 409, 'DOCUMENT_NOT_READY')
export const aiProviderError = (message = 'AI service is temporarily unavailable. Please try again.') =>
  new AppError(message, 502, 'AI_PROVIDER_ERROR')
export const aiGenerationFailed = (message) => new AppError(message, 502, 'AI_GENERATION_FAILED')
export const serviceUnavailable = (message = 'Service temporarily unavailable') =>
  new AppError(message, 503, 'SERVICE_UNAVAILABLE')

export function userSafeMessage(err) {
  if (err instanceof AppError) return err.message
  return 'Something went wrong. Please try again.'
}
