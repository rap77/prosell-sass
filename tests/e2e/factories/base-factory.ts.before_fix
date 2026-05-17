/**
 * Base Factory Interface
 *
 * All test data factories must implement this interface.
 * Provides methods for creating valid, invalid, and edge case data.
 */
export interface TestDataFactory<T> {
  /**
   * Create valid test data with optional overrides.
   * Each call should return a fresh instance with unique values.
   */
  create(overrides?: Partial<T>): T;

  /**
   * Create invalid test data for negative testing.
   * Should violate business rules or validation constraints.
   */
  createInvalid(): T;

  /**
   * Create edge case test data.
   * Tests boundary conditions, special characters, etc.
   */
  createEdgeCase(): T;

  /**
   * Create multiple instances with sequential unique values.
   * Useful for testing list views and pagination.
   */
  createBatch(count: number, overrides?: Partial<T>): T[];
}

/**
 * Abstract base factory with common utilities.
 */
export abstract class BaseFactory<T> implements TestDataFactory<T> {
  protected counter = 0;

  /**
   * Generate unique ID for test data isolation.
   * Format: {prefix}-{timestamp}-{counter}
   */
  protected generateId(prefix: string): string {
    this.counter += 1;
    const timestamp = Date.now();
    return `${prefix}-${timestamp}-${this.counter}`;
  }

  /**
   * Generate unique email for testing.
   * Format: {prefix}{counter}@example.com
   */
  protected generateEmail(prefix: string): string {
    this.counter += 1;
    return `${prefix}${this.counter}@example.com`;
  }

  /**
   * Generate unique phone number for testing.
   * Format: +1-555-{4 digits}
   */
  protected generatePhone(): string {
    this.counter += 1;
    const suffix = String(this.counter).padStart(4, '0');
    return `+1-555-${suffix}`;
  }

  /**
   * Generate ISO datetime string with optional offset.
   */
  protected generateDateTime(offsetMinutes = 0): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() + offsetMinutes);
    return date.toISOString();
  }

  /**
   * Reset counter (useful in test beforeEach).
   */
  reset(): void {
    this.counter = 0;
  }

  // Abstract methods to be implemented by concrete factories
  abstract create(overrides?: Partial<T>): T;
  abstract createInvalid(): T;
  abstract createEdgeCase(): T;
  abstract createBatch(count: number, overrides?: Partial<T>): T[];

  /**
   * Generate valid UUID v4 for testing.
   * Uses crypto.randomUUID() for RFC 4122 v4 UUIDs.
   */
  protected generateUUID(): string {
    return crypto.randomUUID();
  }
}
