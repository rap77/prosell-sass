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
 * Create a cache key for auth operations
 */
export function createAuthCacheKey(endpoint: string, data?: any): string {
  const key = `${CACHE_CONFIG.prefixes.auth}${endpoint}`;
  return data ? `${key}:${JSON.stringify(data)}` : key;
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
    const config = (CACHE_CONFIG.auth as any)[endpointName];
    return config?.ttl !== 0;
  }

  return true;
}
