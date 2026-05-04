/**
 * Centralized error handling
 * Prevents sensitive data leakage in production
 */

export class AppError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, message, 'VALIDATION_ERROR', 400)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'Please sign in to continue', 'AUTH_ERROR', 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'You do not have permission to perform this action', 'FORBIDDEN', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, `${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(
      'Rate limit exceeded',
      'Too many requests. Please try again later.',
      'RATE_LIMIT',
      429
    )
  }
}

/**
 * Handle errors safely without exposing sensitive information
 */
export function handleError(error: unknown): AppError {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error
  }

  // Log the full error for debugging (use Sentry in production)
  if (import.meta.env.DEV) {
    console.error('Unexpected error:', error)
  }

  // Return a safe error message to the user
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  
  return new AppError(
    message,
    'Something went wrong. Please try again.',
    'INTERNAL_ERROR',
    500,
    false
  )
}

/**
 * Format error for display to user
 */
export function formatErrorMessage(error: unknown): string {
  const appError = handleError(error)
  return appError.userMessage
}

/**
 * Check if error should be reported to error tracking
 */
export function shouldReportError(error: unknown): boolean {
  if (error instanceof AppError) {
    return !error.isOperational
  }
  return true
}
