/**
 * Parallel API utilities for eliminating waterfalls
 *
 * Provides optimized patterns for executing multiple API calls concurrently
 * instead of sequentially, reducing total loading time.
 */

/**
 * Execute multiple API calls in parallel and return results in order
 *
 * @param requests Array of API call functions
 * @returns Array of results in the same order as requests
 *
 * Example:
 * ```typescript
 * const [user, posts, comments] = await parallelFetch([
 *   () => authApi.getCurrentUser(accessToken),
 *   () => postsApi.getAll(),
 *   () => commentsApi.getAll()
 * ]);
 * ```
 */
export async function parallelFetch<T>(
  requests: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(requests.map(request => request()));
}

/**
 * Execute API calls in batches with controlled concurrency
 *
 * @param requests Array of API call functions
 * @param batchSize Maximum number of concurrent requests
 * @returns Array of results in the same order as requests
 */
export async function parallelFetchBatches<T>(
  requests: Array<() => Promise<T>>,
  batchSize: number = 3
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(req => req()));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Cache API responses to avoid duplicate requests
 *
 * @param fetchFunction API function to execute
 * @param key Cache key (usually the argument to the API function)
 * @returns Cached API response
 */
export function createCachedApi<T, K>(
  fetchFunction: (key: K) => Promise<T>
): (key: K) => Promise<T> {
  const cache = new Map<K, Promise<T>>();

  return async (key: K) => {
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const promise = fetchFunction(key);
    cache.set(key, promise);

    try {
      return await promise;
    } finally {
      // Remove from cache after successful completion
      cache.delete(key);
    }
  };
}

/**
 * Optimized user data fetching with parallel operations
 */
export async function fetchUserDataParallel(accessToken: string) {
  if (!accessToken) {
    throw new Error('No access token available');
  }

  // All user-related data can be fetched in parallel
  const requests = [
    () => authApi.getCurrentUser(accessToken),
    // Add other parallel user data fetches here:
    // () => userPreferencesApi.get(accessToken),
    // () => userNotificationsApi.getUnread(accessToken),
    // () => userSettingsApi.get(accessToken),
  ];

  return parallelFetch(requests);
}
