/**
 * LRU Cache Implementation for Cross-Request Caching
 *
 * Provides in-memory caching with LRU eviction policy
 * Optimized for API responses to reduce redundant API calls
 *
 * @see https://vercel.com/docs/rules/server-cache-lru.md
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl; // Default 5 minutes
  }

  /**
   * Get value from cache if it exists and is not expired
   */
  get(key: K): V | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V, ttl?: number): void {
    // Remove existing key if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Check if we need to evict the least recently used item
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.ttl,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: K): void {
    this.cache.delete(key);
  }

  /**
   * Clear all values from cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }
}

/**
 * Global API cache instance
 * Shared across all requests in the same server instance
 */
export const apiCache = new LRUCache<string, any>();

/**
 * Cache key generator for API requests
 * Creates unique keys based on method, URL, and request data
 */
export function generateCacheKey(
  method: string,
  url: string,
  data?: any
): string {
  const normalizedMethod = method.toUpperCase();
  const normalizedUrl = url.replace(/https?:\/\/[^\/]+/, "");
  const normalizedData = data ? JSON.stringify(data) : "";

  return `${normalizedMethod}:${normalizedUrl}:${normalizedData}`;
}

/**
 * Decorator for caching API responses
 * Automatically caches successful responses
 */
export function withCache<T>(
  fetcher: (key: string) => Promise<T>,
  options: {
    ttl?: number;
    keyGenerator?: (key: string) => string;
  } = {}
) {
  return async (key: string, fetchOptions?: any): Promise<T> => {
    const cacheKey = options.keyGenerator
      ? options.keyGenerator(key)
      : key;

    // Try to get from cache first
    const cached = apiCache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache the result
    try {
      const result = await fetcher(key);
      apiCache.set(cacheKey, result, options.ttl);
      return result;
    } catch (error) {
      // Don't cache failed requests
      throw error;
    }
  };
}
