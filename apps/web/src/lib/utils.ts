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
