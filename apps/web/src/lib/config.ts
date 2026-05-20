/**
 * Centralised environment configuration.
 * All API base URL references must use API_BASE_URL from here.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window === "undefined" ? "http://localhost:8000" : "");
