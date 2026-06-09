/**
 * Data formatting utilities for the Inventory MVP
 */

/**
 * Format a number as currency (USD)
 * @param amount - The amount to format
 * @param currency - Currency code (default: "USD")
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  decimals = 2,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format mileage number with appropriate unit
 */
export function formatMileage(mileage: number, unit = "mi"): string {
  return new Intl.NumberFormat("en-US").format(mileage) + " " + unit;
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks === 1) return "last week";
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return "last month";
  if (diffMonths < 12) return `${diffMonths} months ago`;
  if (diffYears === 1) return "last year";
  return `${diffYears} years ago`;
}

/**
 * Format a date as a localized date string
 */
export function formatDate(dateString: string, locale = "en-US"): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date as a localized date and time string
 */
export function formatDateTime(dateString: string, locale = "en-US"): string {
  const date = new Date(dateString);
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Format a vehicle title
 */
export function formatVehicleTitle(
  year?: number,
  make?: string,
  model?: string,
  trim?: string,
): string {
  const parts = [year, make, model, trim].filter(Boolean);
  return parts.join(" ") || "Unknown Vehicle";
}
