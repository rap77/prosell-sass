/**
 * Error handling utilities
 *
 * Helper functions for consistent error handling across components.
 */

/**
 * Extract error message from unknown error type.
 * Handles ApiError, Error instances, plain objects with message property,
 * and provides fallback messages.
 *
 * @param error - Unknown error type from catch blocks
 * @param fallbackMessage - Default message if error type cannot be determined
 * @returns Error message string
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  // Handle ApiError instances (from authApi)
  if (error instanceof Error && error.name === "ApiError") {
    return error.message;
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle plain objects with message property (for mocks/tests)
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  // Fallback message
  return fallbackMessage;
}
