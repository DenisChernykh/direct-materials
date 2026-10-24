export const apiErrorCodes = [
  'AUTHENTICATION_REQUIRED',
  'INVALID_CREDENTIALS',
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'CONFLICT',
  'DEPENDENCY_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const

export type ApiErrorCode = (typeof apiErrorCodes)[number]

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: 400 | 401 | 404 | 409 | 502 | 500

  constructor(
    code: ApiErrorCode,
    message: string,
    status: 400 | 401 | 404 | 409 | 502 | 500,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function apiErrorBody(error: ApiError): {
  error: { code: ApiErrorCode; message: string }
} {
  return { error: { code: error.code, message: error.message } }
}
