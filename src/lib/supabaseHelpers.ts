import { formatErrorMessage } from './errorHandler'

/**
 * Wraps an async operation with standardized error handling.
 * Returns the result of the operation or null on failure,
 * and calls setError with a user-friendly message if it fails.
 */
export async function withErrorHandling<T>(
    operation: () => Promise<T>,
    setError: (msg: string | null) => void
): Promise<T | null> {
    try {
        return await operation()
    } catch (err) {
        const errorMsg = formatErrorMessage(err)
        setError(errorMsg)
        return null
    }
}
