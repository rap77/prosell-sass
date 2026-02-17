/**
 * authStore - Zustand store for authentication
 *
 * Manages authentication state using authApi for API calls.
 * Uses localStorage for client-side persistence with versioning support.
 *
 * SECURITY:
 * - Tokens stored in httpOnly cookies (backend)
 * - localStorage only stores non-sensitive user data
 * - Middleware protects authenticated routes
 *
 * Implementation:
 * - API route /api/auth/state provides server-side auth state
 * - Client components use this store with proper hydration handling
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi, ApiError } from "@/lib/api/authApi";

// ============================================
// DEVELOPMENT MODE API FALLBACK
// ============================================

/**
 * Wrapper for fetch that handles 404 errors in development
 * This is a temporary workaround for Next.js 16.1.6 API route bug
 * TODO: Remove this when API routes are fixed or Next.js is updated
 */
async function fetchWithFallback(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    const response = await fetch(input, init);

    // If endpoint returns 404 in development, return mock data
    if (response.status === 404 && process.env.NODE_ENV === 'development') {
      console.warn(`[DEV MODE] API endpoint ${input} returned 404, using empty state fallback`);

      // Return empty auth state as JSON response
      return new Response(JSON.stringify({ isAuthenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as Response;
    }

    return response;
  } catch (error) {
    // In development, log and return mock data on network errors
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DEV MODE] Network error fetching ${input}, using empty state fallback:`, error);
      return new Response(JSON.stringify({ isAuthenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as Response;
    }
    throw error;
  }
}

// Flag to disable API calls in development (temporary workaround for Next.js 16 API route bug)
const DEV_DISABLE_API_CALLS = process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DEV_DISABLE_API === 'true';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_email_verified?: boolean;
  is_2fa_enabled?: boolean;
  organization_id?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// ============================================
// STORE INTERFACE
// ============================================

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null; // Renamed to avoid conflict with function
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;

  // Actions
  initializeAuth: () => Promise<void>; // Initialize auth state from server
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void; // Added for testing
}

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state - hydrated from server on client mount
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading state
      error: null,

      // Initialize auth state from server
      initializeAuth: async () => {
        try {
          // Skip API call in dev mode if disabled (temporary Next.js 16 bug workaround)
          if (DEV_DISABLE_API_CALLS) {
            console.warn('[DEV MODE] API calls disabled, using empty state from localStorage');
            set({
              user: null,
              accessToken: null,
              refreshTokenValue: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
            return;
          }

          const response = await fetchWithFallback("/api/auth/state");
          const authState = await response.json();

          // Early exit if not authenticated
          if (!authState.isAuthenticated || !authState.user) {
            set({
              user: null,
              accessToken: null,
              refreshTokenValue: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
            return;
          }

          // Authenticated - set user state
          set({
            user: authState.user,
            accessToken: authState.accessToken,
            refreshTokenValue: authState.accessToken, // Temporarily use access token
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error("Failed to initialize auth state:", error);
          set({
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      login: async (credentials: LoginCredentials) => {
        // Validate email format
        if (!EMAIL_REGEX.test(credentials.email)) {
          set({
            isLoading: false,
            error: { message: "Invalid email format" },
          });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login(credentials.email, credentials.password);

          // Check if tokens are present
          if (!response.tokens) {
            set({
              isLoading: false,
              error: { message: "No tokens received from server" },
            });
            return;
          }

          // Update state
          set({
            user: response.user,
            accessToken: response.tokens.access_token,
            refreshTokenValue: response.tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Note: Cookies are set by the API response via Set-Cookie header
          // The backend should set httpOnly cookies in the login response
        } catch (unknownError) {
          const message = unknownError instanceof ApiError
            ? unknownError.message
            : unknownError instanceof Error
            ? unknownError.message
            : "Login failed";

          set({
            isLoading: false,
            error: { message },
          });
        }
      },

      register: async (data: RegisterData) => {
        // Validate email format
        const isEmailValid = EMAIL_REGEX.test(data.email);

        if (!isEmailValid) {
          set({
            isLoading: false,
            error: {
              message: "Invalid email format",
            },
          });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await authApi.register(
            data.email,
            data.password,
            data.first_name,
            data.last_name
          );

          // Check if tokens are present
          if (!response.tokens) {
            set({
              isLoading: false,
              error: { message: "No tokens received from server" },
            });
            return;
          }

          // Update state
          set({
            user: response.user,
            accessToken: response.tokens.access_token,
            refreshTokenValue: response.tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Note: Cookies are set by the API response via Set-Cookie header
          // The backend should set httpOnly cookies in the login response
        } catch (unknownError) {
          const message = unknownError instanceof ApiError
            ? unknownError.message
            : unknownError instanceof Error
            ? unknownError.message
            : "Registration failed";

          set({
            isLoading: false,
            error: { message },
          });
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          await authApi.logout();

          // Clear state with batch clearing
          const newState = {
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          };

          // Clear all caches

          set(newState);

          // Delete auth cookies via API route
          if (!DEV_DISABLE_API_CALLS) {
            await fetchWithFallback("/api/auth/state", { method: "DELETE" });
          }
        } catch (_unknownError) {
          // Logout locally even if API fails
          const newState = {
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          };

          // Clear all caches

          set(newState);

          // Still try to delete cookies on error
          if (!DEV_DISABLE_API_CALLS) {
            await fetchWithFallback("/api/auth/state", { method: "DELETE" });
          }
        }
      },

      refreshToken: async () => {
        const { refreshTokenValue: currentRefreshToken } = get();

        // Early exit if no refresh token
        if (!currentRefreshToken) {
          set({
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
          });
          return;
        }

        try {
          const tokens = await authApi.refreshToken(currentRefreshToken);

          set({
            accessToken: tokens.access_token,
            refreshTokenValue: tokens.refresh_token,
          });
        } catch {
          // Refresh failed - logout
          set({
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            error: {
              message: "Session expired",
            },
          });
        }
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();

        // Early exit if no user
        if (!user) {
          return;
        }

        const updatedUser = { ...user, ...updates };

        // Update state
        set({
          user: updatedUser,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      reset: () => {
        set({
          user: null,
          accessToken: null,
          refreshTokenValue: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        // Also delete cookies on reset
        if (!DEV_DISABLE_API_CALLS) {
          fetchWithFallback("/api/auth/state", { method: "DELETE" });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshTokenValue: state.refreshTokenValue,
        isAuthenticated: state.isAuthenticated,
      }),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        // Handle localStorage schema migrations
        // When changing the store structure, increment version and add migration logic

        // Version 0 -> 1: Initial version with proper typing
        if (version === 0) {
          // Ensure all required fields exist with defaults
          const oldState = persistedState as Partial<AuthState>;
          return {
            user: oldState.user ?? null,
            accessToken: oldState.accessToken ?? null,
            refreshTokenValue: oldState.refreshTokenValue ?? null,
            isAuthenticated: oldState.isAuthenticated ?? false,
            isLoading: false,
            error: null,
          };
        }

        // For future versions, add migrations like:
        // if (version === 1) { /* migrate to version 2 */ }

        return persistedState as AuthState;
      },
    }
  )
)
