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

  // Actions
  initializeAuth: () => Promise<void>; // Initialize auth state from server
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
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
      isAuthenticated: false,
      isLoading: true, // Start with loading state
      error: null,

      // Initialize auth state from server
      initializeAuth: async () => {
        try {
          const response = await fetch("/api/auth/state", {
            credentials: "include",  // CRITICAL: Sends httpOnly cookies
          });
          const authState = await response.json();

          // Early exit if not authenticated
          if (!authState.isAuthenticated || !authState.user) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
            return;
          }

          // Authenticated - set user state
          set({
            user: authState.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          logger.error("Failed to initialize auth state", error);
          set({
            user: null,
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

          // Update state - tokens are handled by httpOnly cookies
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
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

          // Update state - tokens are handled by httpOnly cookies
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
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

          // Clear state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          // Delete auth cookies via API route
          try {
            await fetch("/api/auth/state", { method: "DELETE", credentials: "include" });
          } catch (deleteError) {
            logger.error("Failed to delete auth cookies", deleteError);
          }
        } catch (unknownError) {
          // Logout locally even if API fails
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          // Try to delete cookies via API
          try {
            await fetch("/api/auth/state", { method: "DELETE", credentials: "include" });
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

      reset: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        // Also delete cookies via API
        fetch("/api/auth/state", { method: "DELETE", credentials: "include" }).catch((error) => {
          logger.error("Failed to delete auth cookies during reset", error);
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive user data (NO tokens - handled by httpOnly cookies)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      version: 3,
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

        return persistedState as AuthState;
      },
    }
  )
)
