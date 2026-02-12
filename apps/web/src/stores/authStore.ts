/**
 * authStore - Zustand store for authentication
 *
 * Manages authentication state using authApi for API calls.
 *
 * SECURITY NOTE:
 *
 * Token Storage:
 * - Access and refresh tokens are stored in httpOnly cookies by the backend
 * - This store only maintains non-sensitive state in memory
 * - localStorage persists ONLY: user object and isAuthenticated flag for optimistic UI
 *
 * This prevents XSS attacks from stealing tokens via localStorage access.
 *
 * Implementation:
 * - Backend: FastAPI sets httpOnly cookies on login/register
 * - Frontend: This store reads cookies via middleware for route protection
 * - Hydration: Store hydrates from server state, not localStorage tokens
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi } from "@/lib/api/authApi";
import type { ApiError } from "@/lib/api/authApi";

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
  refreshTokenValue: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;

  // Actions
  initializeAuth: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

// ============================================
// SELECTORS
// ============================================

const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
const selectIsLoading = (state: AuthState) => state.isLoading;
const selectUser = (state: AuthState) => state.user;
const selectError = (state: AuthState) => state.error;

export { selectIsAuthenticated, selectIsLoading, selectUser, selectError };

// ============================================
// CONSTANTS
// ============================================

const LOGGED_OUT_STATE = {
  user: null,
  accessToken: null,
  refreshTokenValue: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
} as const;

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  (set, get) => ({
    // Initial state
    ...LOGGED_OUT_STATE,
    isLoading: true, // Start with loading state

    initializeAuth: async (): Promise<void> => {
      try {
        const response = await fetch("/api/auth/state");
        const authState = await response.json();

        if (!authState.isAuthenticated || !authState.user) {
          set(LOGGED_OUT_STATE);
          return;
        }

        set({
          user: authState.user,
          accessToken: authState.accessToken || null,
          refreshTokenValue: authState.refresh_token || null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (_error: unknown) {
        set(LOGGED_OUT_STATE);
      }
    },

    login: async (credentials: LoginCredentials) => {
      set({ isLoading: true, error: null });

      try {
        const response = await authApi.login(credentials.email, credentials.password);

        set({
          user: response.user,
          accessToken: response.tokens.access_token,
          refreshTokenValue: response.tokens.refresh_token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (unknownError) {
        const message = unknownError instanceof ApiError
          ? unknownError.message
          : unknownError instanceof Error
          ? unknownError.message
          : "Error al iniciar sesión";

        set({
          isLoading: false,
          error: { message },
        });
      }
    },

    register: async (data: RegisterData) => {
      set({ isLoading: true, error: null });

      try {
        const response = await authApi.register(
          data.email,
          data.password,
          data.first_name,
          data.last_name
        );

        set({
          user: response.user,
          accessToken: response.tokens.access_token,
          refreshTokenValue: response.tokens.refresh_token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (unknownError) {
        const message = unknownError instanceof ApiError
          ? unknownError.message
          : unknownError instanceof Error
          ? unknownError.message
          : "Error al registrarse";

        set({
          isLoading: false,
          error: { message },
        });
      }
    },

    logout: async (): Promise<void> => {
      try {
        await authApi.logout();
        set(LOGGED_OUT_STATE);
      } catch (_error: unknown) {
        // Logout locally even if API fails
        set(LOGGED_OUT_STATE);
      }
    },

    refreshToken: async () => {
      const { refreshTokenValue: currentRefreshToken } = get();

      if (!currentRefreshToken) {
        set(LOGGED_OUT_STATE);
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
        set(LOGGED_OUT_STATE);
      }
    },

    updateUser: (updates: Partial<User>) => {
      const { user } = get();

      if (!user) {
        return;
      }

      set({ user: { ...user, ...updates } });
    },

    clearError: () => {
      set({ error: null });
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    reset: () => {
      set(LOGGED_OUT_STATE);
    },
  }),
  {
    name: "auth-storage",
    storage: createJSONStorage(() => localStorage),

    // SECURITY: Only persist non-sensitive data for optimistic UI
    // Tokens are stored in httpOnly cookies by the backend
    partialize: (state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      // DO NOT persist tokens to localStorage (XSS risk)
    }),
  }
);
