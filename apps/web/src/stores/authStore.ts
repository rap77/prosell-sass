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
import { logger } from "@/lib/logger";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// PERFORMANCE API HELPERS
// ============================================

/**
 * Feature detection wrapper for Performance.mark()
 * Silently skips if Performance API is unavailable
 */
const markPerformance = (name: string) => {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(name);
  }
};

/**
 * Feature detection wrapper for Performance.measure()
 * Measures duration between two marks and logs in dev mode
 */
const measurePerformance = (
  name: string,
  startMark: string,
  endMark: string,
) => {
  if (typeof performance !== "undefined" && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);

      if (process.env.NODE_ENV === "development") {
        const measures = performance.getEntriesByName(name);
        const measure = measures[0];
        if (measure) {
          logger.info(`${name} took ${measure.duration.toFixed(2)}ms`);
        }
      }
    } catch (error) {
      // Ignore errors from performance.measure (e.g., duplicate marks)
      logger.info("Performance measure failed", error);
    }
  }
};

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

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  initialized: boolean; // Track if auth state has been initialized from server

  // Actions
  initializeAuth: () => Promise<void>; // Initialize auth state from server
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => Promise<void>;
}

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state - hydrated from server on client mount
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading state
      error: null,
      initialized: false, // Track if auth has been initialized

      // Initialize auth state from server
      initializeAuth: async () => {
        // Early exit if already initialized (when feature flag enabled)
        const { initialized } = get();
        const useOptimization = useFeatureFlagStore
          .getState()
          .get("auth-init-fix", true);

        if (useOptimization && initialized) {
          logger.info("Auth already initialized, skipping API call");
          set({ isLoading: false });
          return;
        }

        markPerformance("auth-init-start");

        try {
          const { API_BASE_URL } = await import("@/lib/config");
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/state`, {
            credentials: "include", // CRITICAL: Sends httpOnly cookies
          });
          const authState = await response.json();

          // Early exit if not authenticated
          if (!authState.isAuthenticated || !authState.user) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              initialized: true, // Mark as initialized to prevent retry loop
              error: null,
            });
            return;
          }

          // Authenticated - set user state
          set({
            user: authState.user,
            isAuthenticated: true,
            isLoading: false,
            initialized: true, // Successfully initialized
            error: null,
          });
        } catch (error) {
          logger.error("Failed to initialize auth state", error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: true, // Prevent infinite retry loop
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to check authentication status",
            },
          });
        } finally {
          markPerformance("auth-init-end");
          measurePerformance(
            "auth-init-duration",
            "auth-init-start",
            "auth-init-end",
          );
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
          const response = await authApi.login(
            credentials.email,
            credentials.password,
          );

          // Update state - tokens are handled by httpOnly cookies
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            initialized: false,
            error: null,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
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
          await authApi.register(
            data.email,
            data.password,
            data.first_name,
            data.last_name,
          );

          // Registration does NOT authenticate the user — email verification required
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // Not initialized — user must verify email then login
            error: null,
          });

          // Navigation to /auth/verify-email is handled by the RegisterForm component
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
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
          set({ isLoading: true, initialized: false }); // Reset initialized flag on logout

          await authApi.logout();

          // Clear state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // Confirm reset
            error: null,
          });

          // Delete auth cookies via API route
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            await fetch(`${apiUrl}/api/auth/state`, {
              method: "DELETE",
              credentials: "include",
            });
          } catch (deleteError) {
            logger.error("Failed to delete auth cookies", deleteError);
          }
        } catch (unknownError) {
          // Logout locally even if API fails
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // Confirm reset on error
            error: null,
          });

          // Try to delete cookies via API
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            await fetch(`${apiUrl}/api/auth/state`, {
              method: "DELETE",
              credentials: "include",
            });
          } catch (deleteError) {
            logger.error("Failed to delete auth cookies", deleteError);
          }
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

      reset: async () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          initialized: false,
          error: null,
        });

        // Delete httpOnly cookies via API — awaited so callers can sequence navigation after this
        try {
          const { API_BASE_URL } = await import("@/lib/config");
          await fetch(`${API_BASE_URL}/api/auth/state`, {
            method: "DELETE",
            credentials: "include",
          });
        } catch (error) {
          logger.error("Failed to delete auth cookies during reset", error);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive user data (NO tokens - handled by httpOnly cookies)
      // Vercel best practice: Minimize serialization - only store essential fields
      partialize: (state) => ({
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
              first_name: state.user.first_name,
              last_name: state.user.last_name,
              is_email_verified: state.user.is_email_verified,
              is_2fa_enabled: state.user.is_2fa_enabled,
            }
          : null,
        isAuthenticated: state.isAuthenticated,
        // `initialized` is intentionally NOT persisted — must always verify with
        // the server on mount to detect expired cookies and stale localStorage state.
      }),
      version: 4,
      migrate: (persistedState: unknown, version: number) => {
        // Handle localStorage schema migrations
        // When changing the store structure, increment version and add migration logic

        // Version 0 -> 1: Initial version with proper typing
        if (version === 0) {
          const oldState = persistedState as Partial<AuthState>;
          return {
            user: oldState.user ?? null,
            isAuthenticated: oldState.isAuthenticated ?? false,
            isLoading: false,
            error: null,
          };
        }

        // Version 1 -> 2: Remove tokens from localStorage (security fix)
        if (version === 1) {
          const oldState = persistedState as Partial<AuthState>;
          return {
            user: oldState.user ?? null,
            isAuthenticated: oldState.isAuthenticated ?? false,
            isLoading: false,
            error: null,
          };
        }

        // Version 2 -> 3: Final cleanup (ensure no token fields exist)
        if (version === 2) {
          const oldState = persistedState as Partial<AuthState>;
          return {
            user: oldState.user ?? null,
            isAuthenticated: oldState.isAuthenticated ?? false,
            isLoading: false,
            error: null,
          };
        }

        // Version 3 -> 4: Optimize user serialization (only essential fields)
        if (version === 3) {
          const oldState = persistedState as Partial<AuthState>;
          return {
            user: oldState.user
              ? {
                  id: oldState.user.id,
                  email: oldState.user.email,
                  first_name: oldState.user.first_name,
                  last_name: oldState.user.last_name,
                  is_email_verified: oldState.user.is_email_verified,
                  is_2fa_enabled: oldState.user.is_2fa_enabled,
                }
              : null,
            isAuthenticated: oldState.isAuthenticated ?? false,
            isLoading: false,
            error: null,
          };
        }

        return persistedState as AuthState;
      },
    },
  ),
);
