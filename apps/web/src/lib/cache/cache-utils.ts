/**
 * Cache Utilities for Server-Side Performance
 *
 * Provides utilities for caching API responses and optimizing data fetching
 *
 * @see https://vercel.com/docs/rules/server-cache-react.md
 */

import { apiCache, generateCacheKey } from './lru-cache';

/**
 * Cache configuration for different API endpoints
 */
export const CACHE_CONFIG = {
  // Auth endpoints - short cache since they involve sensitive data
  auth: {
    login: { ttl: 0 }, // Don't cache login
    register: { ttl: 0 }, // Don't cache registration
    'current-user': { ttl: 2 * 60 * 1000 }, // 2 minutes
    'verify-email': { ttl: 0 }, // Don't cache verification
    'forgot-password': { ttl: 0 }, // Don't cache password reset
    'reset-password': { ttl: 0 }, // Don't cache password reset
    '2fa/enable': { ttl: 0 }, // Don't cache 2FA operations
    '2fa/verify': { ttl: 0 }, // Don't cache 2FA verification
    '2fa/disable': { ttl: 0 }, // Don't cache 2FA operations
  },

  // Default cache time for non-auth endpoints
  default: 5 * 60 * 1000, // 5 minutes

  // Cache keys prefixes
  prefixes: {
    user: 'user:',
    auth: 'auth:',
    session: 'session:',
  },
} as const;

/**
 * Create a cache key for user data
 */
export function createUserCacheKey(userId: string): string {
  return `${CACHE_CONFIG.prefixes.user}${userId}`;
}

/**
 * Sensitive field names that should NEVER be in cache keys
 *
 * SECURITY: These fields contain secrets that must not be exposed in:
 * - Memory/cache keys (could be dumped or logged)
 * - Error messages (could leak to logs/monitoring)
 * - Browser devtools (accessible to XSS)
 */
const SENSITIVE_FIELDS = new Set<string>([
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'accessToken',
  'refreshToken',
  'refresh_token',
  'access_token',
]);

/**
 * Create a cache key for auth operations
 *
 * SECURITY: Automatically filters out sensitive fields from cache keys
 * to prevent secrets from being stored in memory or logged.
 *
 * @param endpoint - The auth endpoint name (e.g., 'login', 'register')
 * @param data - The request data (sensitive fields will be filtered out)
 * @returns A safe cache key without sensitive data
 */
export function createAuthCacheKey(endpoint: string, data?: Record<string, unknown>): string {
  const key = `${CACHE_CONFIG.prefixes.auth}${endpoint}`;

  if (!data || typeof data !== 'object') {
    return key;
  }

  // Create safe version of data excluding sensitive fields
  const safeData = Object.entries(data)
    .filter(([fieldName]) => !SENSITIVE_FIELDS.has(fieldName))
    .reduce<Record<string, unknown>>((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});

  // If no safe data remains, return just the endpoint
  const dataStr = Object.keys(safeData).length > 0
    ? `:${JSON.stringify(safeData)}`
    : '';

  return `${key}${dataStr}`;
}

/**
 * Invalidate specific cache entries
 */
export function invalidateCache(patterns: string[]): void {
  patterns.forEach(pattern => {
    const keysToDelete: string[] = [];

    // Find all keys matching the pattern
    apiCache["cache"].forEach((_, key) => {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    });

    // Delete matching keys
    keysToDelete.forEach(key => apiCache.delete(key));
  });
}

/**
 * Clear all auth-related cache
 */
export function clearAuthCache(): void {
  invalidateCache([
    CACHE_CONFIG.prefixes.auth,
    CACHE_CONFIG.prefixes.user,
    CACHE_CONFIG.prefixes.session,
  ]);
}

/**
 * Check if a request should be cached based on method and endpoint
 */
export function shouldCacheRequest(method: string, endpoint: string): boolean {
  const methodUpper = method.toUpperCase();

  // Only cache GET requests
  if (methodUpper !== 'GET') {
    return false;
  }

  // Don't cache auth-related GET requests
  if (endpoint.includes('/auth/')) {
    const endpointName = endpoint.split('/').pop() || '';
    // Type assertion: CACHE_CONFIG.auth has known endpoints with ttl property
    const authConfig = CACHE_CONFIG.auth as Record<string, { ttl: number }>;
    const config = authConfig[endpointName];
    return config?.ttl !== 0;
  }

  return true;
}
