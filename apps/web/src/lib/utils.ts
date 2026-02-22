/**
 * Utility functions for the application
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { logger } from "./logger";

/**
 * Combines class names using clsx and tailwind-merge
 * Use this for conditional classes or when merging className props
 *
 * @example
 * ```tsx
 * <div className={cn("base-class", isActive && "active-class")} />
 * <button className={cn("px-4 py-2", className)} />
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ============================================

/**
 * Batch DOM CSS changes to minimize reflows
 * @param element - DOM element to update
 * @param styles - Object containing CSS properties to set
 */
export function batchCSS(element: HTMLElement, styles: Record<string, string>) {
  const cssText = Object.entries(styles)
    .map(([prop, value]) => `${prop}: ${value}`)
    .join("; ");

  element.style.cssText += `; ${cssText}`;
}

/**
 * Check array length before expensive operation
 * @param array - Array to check
 * @param expensiveOperation - Operation to run if array has items
 * @returns Result of operation or undefined
 */
export function withArrayLengthCheck<T>(
  array: unknown[],
  expensiveOperation: () => T,
): T | undefined {
  if (!array.length) {
    return undefined;
  }

  return expensiveOperation();
}

/**
 * Create a stable ref for event handlers to prevent re-renders
 * @param handler - Event handler function
 * @returns Ref object with stable handler
 */
export function createEventHandlerRef<
  T extends (...args: unknown[]) => unknown,
>(handler: T) {
  return {
    current: handler,
  };
}

/**
 * Hoist regular expressions outside components for better performance
 * @param pattern - Regular expression pattern
 * @param flags - Regular expression flags
 * @returns Compiled RegExp
 */
export function hoistRegExp(pattern: string, flags?: string): RegExp {
  return new RegExp(pattern, flags);
}

/**
 * Use Set for O(1) lookups instead of array.includes()
 * @param items - Items to create Set from
 * @returns Set for O(1) lookups
 */
export function createLookupSet<T>(items: T[]): Set<T> {
  return new Set(items);
}

/**
 * Early exit pattern for conditionals
 * @param condition - Condition to check
 * @param fn - Function to execute if condition is true
 * @returns Result of function or undefined
 */
export function earlyExit<T>(condition: boolean, fn: () => T): T | undefined {
  if (!condition) {
    return undefined;
  }

  return fn();
}

/**
 * Use toSorted() for immutability (for environments that support it)
 * @param array - Array to sort
 * @param compareFn - Compare function
 * @returns New sorted array
 */
export function immutableSort<T>(
  array: T[],
  compareFn?: (a: T, b: T) => number,
): T[] {
  return array.toSorted
    ? array.toSorted(compareFn)
    : [...array].sort(compareFn);
}

/**
 * Optimize localStorage operations with caching and versioning
 *
 * Versioning prevents schema conflicts when data structure changes.
 * All keys are prefixed with version (e.g., "cache-key:v1").
 */
export const storageCache = (() => {
  const cache = new Map<
    string,
    { value: unknown; timestamp: number; ttl?: number }
  >();
  const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  const STORAGE_VERSION = "v1"; // Version for localStorage schema migration

  // Helper to add version prefix to keys
  const versionedKey = (key: string) => `${key}:${STORAGE_VERSION}`;

  return {
    get(key: string): unknown | null {
      const cached = cache.get(key);

      if (cached) {
        if (cached.ttl && Date.now() - cached.timestamp > cached.ttl) {
          cache.delete(key);
          return null;
        }
        return cached.value;
      }

      try {
        const value = localStorage.getItem(versionedKey(key));
        if (value) {
          const parsed = JSON.parse(value) as unknown;
          cache.set(key, { value: parsed, timestamp: Date.now() });
          return parsed;
        }
      } catch (error) {
        logger.error("Failed to get from localStorage", error);
      }

      return null;
    },

    set(key: string, value: unknown, ttl?: number): void {
      cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl: ttl || DEFAULT_TTL,
      });

      try {
        localStorage.setItem(versionedKey(key), JSON.stringify(value));
      } catch (error) {
        logger.error("Failed to set to localStorage", error);
      }
    },

    delete(key: string): void {
      cache.delete(key);

      try {
        localStorage.removeItem(versionedKey(key));
      } catch (error) {
        logger.error("Failed to delete from localStorage", error);
      }
    },

    clear(): void {
      cache.clear();

      try {
        // Clear only current version keys
        const keysToDelete = Object.keys(localStorage)
          .filter((k) => k.endsWith(`:${STORAGE_VERSION}`))
          .map((k) => versionedKey(k.replace(`:${STORAGE_VERSION}`, "")));

        keysToDelete.forEach((k) => localStorage.removeItem(k));
      } catch (error) {
        logger.error("Failed to clear localStorage", error);
      }
    },

    // Helper to clear old version keys during migration
    clearOldVersion(key: string, oldVersion: string): void {
      try {
        localStorage.removeItem(`${key}:${oldVersion}`);
      } catch (error) {
        logger.error("Failed to clear old version from localStorage", error);
      }
    },
  };
})();
