/**
 * Utility functions for the application
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
 * Module-level cache for frequently used function results
 * Prevents expensive computations from running multiple times
 */
const functionCache = new Map<string, any>();

/**
 * Cache expensive function results with a key
 * @param key - Cache key
 * @param fn - Function to execute
 * @param ttl - Time to live in milliseconds (optional)
 * @returns Cached result or new execution result
 */
export function cacheFunction<T>(
  key: string,
  fn: () => T,
  ttl?: number
): T {
  const cached = functionCache.get(key);

  if (cached) {
    // Check if cached result has expired
    if (ttl && cached.timestamp && Date.now() - cached.timestamp > ttl) {
      functionCache.delete(key);
    } else {
      return cached.value;
    }
  }

  // Execute and cache the result
  const result = fn();
  functionCache.set(key, {
    value: result,
    timestamp: Date.now()
  });

  return result;
}

/**
 * Batch DOM CSS changes to minimize reflows
 * @param element - DOM element to update
 * @param styles - Object containing CSS properties to set
 */
export function batchCSS(element: HTMLElement, styles: Record<string, string>) {
  const cssText = Object.entries(styles)
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ');

  element.style.cssText += `; ${cssText}`;
}

/**
 * Cache object property access in loops
 * @param obj - Object to cache properties from
 * @returns Proxy that caches property accesses
 */
export function cacheObjectProperties<T extends object>(obj: T): T {
  const propertyCache = new Map<string, any>();

  return new Proxy(obj, {
    get(target, prop) {
      if (typeof prop === 'string') {
        if (propertyCache.has(prop)) {
          return propertyCache.get(prop);
        }

        const value = (target as any)[prop];
        propertyCache.set(prop, value);
        return value;
      }

      return (target as any)[prop];
    }
  });
}

/**
 * Create a Map for repeated lookups (O(1) vs O(n))
 * @param array - Array to create lookup map from
 * @param keyFn - Function to extract key from each item
 * @returns Map for O(1) lookups
 */
export function createLookupMap<T, K>(
  array: T[],
  keyFn: (item: T) => K
): Map<K, T> {
  return new Map(array.map(item => [keyFn(item), item]));
}

/**
 * Combine multiple filter/map operations into a single loop
 * @param array - Array to process
 * @param filters - Filter functions
 * @param mappers - Map functions
 * @returns Processed array
 */
export function combineOperations<T, R>(
  array: T[],
  filters: ((item: T) => boolean)[],
  mappers: ((item: T) => R)[]
): R[] {
  const result: R[] = [];

  for (const item of array) {
    // Apply all filters
    const shouldInclude = filters.every(filter => filter(item));

    if (shouldInclude) {
      // Apply all mappers
      let mappedItem: any = item;
      for (const mapper of mappers) {
        mappedItem = mapper(mappedItem);
      }
      result.push(mappedItem);
    }
  }

  return result;
}

/**
 * Check array length before expensive operations
 * @param array - Array to check
 * @param expensiveOperation - Function to execute if array has items
 * @returns Result of expensive operation or undefined
 */
export function withArrayLengthCheck<T>(
  array: any[],
  expensiveOperation: () => T
): T | undefined {
  if (array.length === 0) {
    return undefined;
  }

  return expensiveOperation();
}

/**
 * Create a stable ref for event handlers to prevent re-renders
 * @param handler - Event handler function
 * @returns Ref object with stable handler
 */
export function createEventHandlerRef<T extends (...args: any[]) => any>(
  handler: T
) {
  return {
    current: handler
  };
}

/**
 * UseLatest hook implementation for stable callback refs
 * @param callback - Callback function
 * @returns Ref with latest callback
 */
export function useLatest<T extends (...args: any[]) => any>(callback: T) {
  const callbackRef = { current: callback };

  // Update ref on every render
  callbackRef.current = callback;

  return callbackRef;
}

/**
 * Hoist regular expressions outside components for better performance
 * @param pattern - Regular expression pattern
 * @param flags - Regular expression flags
 * @returns Compiled RegExp
 */
export function hoistRegExp(pattern: string, flags?: string): RegExp {
  // Create a unique key for this RegExp
  const key = `${pattern}:${flags || ''}`;

  return new RegExp(pattern, flags);
}

/**
 * Check if array contains values before performing expensive comparison
 * @param array1 - First array
 * @param array2 - Second array
 * @param compareFn - Comparison function
 * @returns Comparison result or false if arrays are empty
 */
export function safeArrayCompare<T>(
  array1: T[],
  array2: T[],
  compareFn: (a: T[], b: T[]) => boolean
): boolean {
  if (array1.length === 0 || array2.length === 0) {
    return false;
  }

  return compareFn(array1, array2);
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
 * Create early exit function for better readability and performance
 * @param condition - Condition to check
 * @param fn - Function to execute if condition is true
 * @returns Result of fn if condition is true, undefined otherwise
 */
export function earlyExit<T>(
  condition: boolean,
  fn: () => T
): T | undefined {
  if (!condition) {
    return undefined;
  }

  return fn();
}

/**
 * Optimize localStorage operations with caching
 */
export const storageCache = (() => {
  const cache = new Map<string, { value: any; timestamp: number; ttl?: number }>();
  const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  return {
    get(key: string): any | null {
      const cached = cache.get(key);

      if (cached) {
        if (cached.ttl && Date.now() - cached.timestamp > cached.ttl) {
          cache.delete(key);
          return null;
        }
        return cached.value;
      }

      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          cache.set(key, { value: parsed, timestamp: Date.now() });
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to get from localStorage:', error);
      }

      return null;
    },

    set(key: string, value: any, ttl?: number): void {
      cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl: ttl || DEFAULT_TTL
      });

      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to set to localStorage:', error);
      }
    },

    delete(key: string): void {
      cache.delete(key);

      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to delete from localStorage:', error);
      }
    },

    clear(): void {
      cache.clear();

      try {
        localStorage.clear();
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
    }
  };
})();

/**
 * Memoize derived state to prevent unnecessary re-renders
 * @param fn - Function to memoize
 * @param deps - Dependencies for memoization
 * @returns Memoized result
 */
export function useMemoize<T>(fn: () => T, deps: any[]): T {
  const key = deps.join(':');
  return cacheFunction(key, fn);
}

/**
 * Use toSorted() for immutability (for environments that support it)
 * @param array - Array to sort
 * @param compareFn - Compare function
 * @returns New sorted array
 */
export function immutableSort<T>(
  array: T[],
  compareFn?: (a: T, b: T) => number
): T[] {
  return array.toSorted ?
    array.toSorted(compareFn) :
    [...array].sort(compareFn);
}
