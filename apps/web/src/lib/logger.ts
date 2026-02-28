/**
 * Minimalist Logger Wrapper
 *
 * Centralizes logging for the application.
 * In development, uses console for visibility.
 * In production, can be extended to send logs to Sentry, Axiom, or other services.
 *
 * Usage:
 * ```ts
 * import { logger } from "@/lib/logger";
 * logger.error("Failed to set auth cookies:", error);
 * ```
 */

type LogLevel = "info" | "error" | "warn";

interface LogContext {
  [key: string]: any;
}

export const logger = {
  /**
   * Log informational messages
   * Only logs in development to avoid noise in production
   */
  info(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === "development") {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log error messages
   * Logs in all environments (errors should always be visible)
   *
   * NOTE: In production, integrate with error tracking service (Sentry, Axiom, etc.)
   * See docs/technical-debt/error-tracking-setup.md for configuration
   */
  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  },

  /**
   * Log warning messages
   * Only logs in development
   */
  warn(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
};
