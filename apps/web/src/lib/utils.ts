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
 * Check array length before expensive operations
 * @param array - Array to check
 * @param expensiveOperation - Function to execute if array has items
 * @returns Result of expensive operation or undefined
 */
export function withArrayLengthCheck<T>(
  array: unknown[],
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
export function createEventHandlerRef<T extends (...args: unknown[]) => unknown>(
  handler: T
) {
  return {
    current: handler
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
