/**
 * Test-specific authStore without persist middleware
 *
 * This file provides a version of authStore without the persist middleware
 * to avoid React "was not wrapped in act" warnings during testing.
 *
 * The persist middleware does async hydration from localStorage, which causes
 * state updates outside of React's act(). For tests, we don't need persistence,
 * so we use this simpler version.
 */

import { create } from "zustand";
import { authApi, ApiError } from "@/lib/api/authApi";
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthError,
} from "@/stores/authStore";

/**
 * Test-specific auth store interface (same as production but without persist)
 */
interface TestAuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
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
  reset: () => void;
}

/**
 * Test-specific auth store without persist middleware
 *
 * This is a clone of the production store but without persist,
 * which eliminates the async hydration that causes act() warnings.
 */
export const useTestAuthStore = create<TestAuthState>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshTokenValue: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.login(
        credentials.email,
        credentials.password
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
      const message =
        unknownError instanceof ApiError
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
      const message =
        unknownError instanceof ApiError
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

      set({
        user: null,
        accessToken: null,
        refreshTokenValue: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
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
    }
  },

  refreshToken: async () => {
    const { refreshTokenValue: currentRefreshToken } = get();

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
    } catch (_unknownError) {
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

    if (!user) {
      return;
    }

    set({
      user: { ...user, ...updates },
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
  },
}));
