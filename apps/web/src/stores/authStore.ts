/**
 * authStore - Zustand store for authentication
 *
 * Manages authentication state using authApi for API calls.
 *
 * SECURITY NOTE: This store uses zustand persist middleware which stores
 * auth tokens in localStorage. This is acceptable for client-side only
 * apps but httpOnly cookies are recommended for production apps.
 *
 * TODO: Implement cookie-based auth storage using Next.js Server Actions:
 * - Create server actions for setting/deleting httpOnly cookies
 * - Use those actions from API routes instead of client-side storage
 * - This would protect tokens from XSS attacks
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi, ApiError } from "@/lib/api/authApi";

// TODO: Implement Server Actions for httpOnly cookie management
// For now, using client-side storage with zustand persist
const setAuthCookies = async (_authData: unknown) => {
  // NOOP: Will be replaced with Server Actions that set httpOnly cookies
};
const deleteAuthCookies = async () => {
  // NOOP: Will be replaced with Server Actions that delete httpOnly cookies
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
// STORE CREATION
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login(credentials.email, credentials.password);

          // Update state
          set({
            user: response.user,
            accessToken: response.tokens.access_token,
            refreshTokenValue: response.tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Set auth cookies for server-side middleware
          await setAuthCookies({
            accessToken: response.tokens.access_token,
            refreshToken: response.tokens.refresh_token,
            user: {
              id: response.user.id,
              email: response.user.email,
              first_name: response.user.first_name,
              last_name: response.user.last_name,
              role: response.user.role,
              is_email_verified: response.user.is_email_verified ?? false,
              is_2fa_enabled: response.user.is_2fa_enabled ?? false,
            },
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

          // Update state
          set({
            user: response.user,
            accessToken: response.tokens.access_token,
            refreshTokenValue: response.tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Set auth cookies for server-side middleware
          await setAuthCookies({
            accessToken: response.tokens.access_token,
            refreshToken: response.tokens.refresh_token,
            user: {
              id: response.user.id,
              email: response.user.email,
              first_name: response.user.first_name,
              last_name: response.user.last_name,
              role: response.user.role,
              is_email_verified: response.user.is_email_verified ?? false,
              is_2fa_enabled: response.user.is_2fa_enabled ?? false,
            },
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

      logout: async () => {
        try {
          set({ isLoading: true });

          await authApi.logout();

          // Clear state
          set({
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          // Delete auth cookies
          await deleteAuthCookies();
        } catch (_unknownError) {
          // Logout locally even if API fails
          set({
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          // Still try to delete cookies on error
          await deleteAuthCookies();
        }
      },

      refreshToken: async () => {
        const { refreshTokenValue: currentRefreshToken } = get();

        if (!currentRefreshToken) {
          // No refresh token - logout
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
        } catch (_unknownError) {
          // Refresh failed - logout
          set({
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            error: {
              message: "Sesión expirada",
            },
          });
        }
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();

        if (user) {
          set({
            user: { ...user, ...updates },
          });
        }
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
        deleteAuthCookies();
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
    }
  )
);
