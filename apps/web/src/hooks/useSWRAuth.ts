/**
 * SWR Hook for Authentication Data Fetching
 *
 * Provides optimized data fetching with caching, deduplication, and revalidation
 * Based on SWR (stale-while-revalidate) pattern
 *
 * @see https://vercel.com/docs/rules/client-swr-dedup.md
 */

import useSWRMutation from 'swr/mutation';
import useSWR from 'swr';
import { authApi } from '../lib/api/authApi';
import { useAuthStore } from '../stores/authStore';

/**
 * Fetcher function for SWR with auth context
 */
async function fetcher<T>(url: string, { arg }: { arg?: any }): Promise<T> {
  if (arg?.token) {
    return authApi.getCurrentUser(arg.token);
  }
  return Promise.reject(new Error('No token provided'));
}

/**
 * Hook for fetching current user data with SWR
 */
export function useCurrentUser() {
  const { accessToken, isAuthenticated, setAuthCookies, logout } = useAuthStore();

  // Use SWR for automatic caching and deduplication
  const { data: user, error, isLoading, mutate } = useSWR(
    isAuthenticated && accessToken ? ['/api/auth/me', { token: accessToken }] : null,
    fetcher,
    {
      // Revalidate every 2 minutes
      refreshInterval: 2 * 60 * 1000,

      // Revalidate on focus
      revalidateOnFocus: true,

      // Revalidate on reconnect
      revalidateOnReconnect: true,

      // Error retry configuration
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on auth errors
        if (error.status === 401) {
          logout();
          return;
        }

        // Stop retrying after 3 attempts
        if (retryCount >= 3) {
          return;
        }

        // Exponential backoff for retries
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 1000 * Math.pow(2, retryCount));
      },
    }
  );

  return {
    user,
    isLoading,
    error,
    mutate,
    isAuthenticated,
  };
}

/**
 * Hook for mutations (login, register, logout)
 */
export function useAuthMutations() {
  const { setAuthCookies, logout, setUser } = useAuthStore();

  // Login mutation
  const login = useSWRMutation(
    '/api/auth/login',
    async (url: string, { arg }: { arg: { email: string; password: string } }) => {
      const response = await authApi.login(arg.email, arg.password);

      // Store auth data
      if (response.tokens && response.user) {
        await setAuthCookies(response);
        setUser(response.user);
      }

      return response;
    },
    {
      // Optimistic update on login
      optimisticData: (currentData, { arg }) => ({
        ...currentData,
        loginInProgress: true,
      }),

      // Revalidate user data after login
      revalidate: false,
    }
  );

  // Register mutation
  const register = useSWRMutation(
    '/api/auth/register',
    async (url: string, { arg }: { arg: { email: string; password: string; first_name: string; last_name: string } }) => {
      const response = await authApi.register(arg.email, arg.password, arg.first_name, arg.last_name);

      // Store auth data
      if (response.tokens && response.user) {
        await setAuthCookies(response);
        setUser(response.user);
      }

      return response;
    },
    {
      // Optimistic update on register
      optimisticData: (currentData, { arg }) => ({
        ...currentData,
        registerInProgress: true,
      }),

      // Revalidate user data after register
      revalidate: false,
    }
  );

  // Logout mutation
  const logout = useSWRMutation(
    '/api/auth/logout',
    async (url: string) => {
      await authApi.logout();
      logout();
    },
    {
      // Optimistic update on logout
      optimisticData: (currentData) => ({
        ...currentData,
        user: null,
        isAuthenticated: false,
      }),
    }
  );

  return {
    login,
    register,
    logout,
  };
}

/**
 * Hook for deduplicating authentication requests
 */
export function useAuthDeduplication() {
  const { isLoginInProgress, isRegisterInProgress } = useAuthStore();

  // Prevent duplicate login attempts
  const canLogin = !isLoginInProgress;

  // Prevent duplicate register attempts
  const canRegister = !isRegisterInProgress;

  return {
    canLogin,
    canRegister,
  };
}
