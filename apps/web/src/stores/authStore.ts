/**
 * authStore - Zustand store for authentication
 * GREEN PHASE - Implementación para hacer pasar los tests
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { persist } from "zustand/middleware";

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
// API CLIENT (MOCK for tests - replace with real API)
// ============================================

// TODO: Replace with real authApi import
async function mockLoginApi(credentials: LoginCredentials): Promise<{
  user: User;
  tokens: AuthTokens;
}> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock validation
  if (credentials.email === "wrong@example.com") {
    throw new Error("Credenciales inválidas");
  }

  return {
    user: {
      id: "1",
      email: credentials.email,
      first_name: "Test",
      last_name: "User",
      role: "sales_agent",
      is_email_verified: true,
    },
    tokens: {
      access_token: `mock-access-${Date.now()}`,
      refresh_token: `mock-refresh-${Date.now()}`,
    },
  };
}

async function mockRegisterApi(data: RegisterData): Promise<{
  user: User;
  tokens: AuthTokens;
}> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (data.email === "existing@example.com") {
    throw new Error("El email ya existe");
  }

  return {
    user: {
      id: "2",
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      role: "sales_user",
      is_email_verified: false,
    },
    tokens: {
      access_token: `mock-access-${Date.now()}`,
      refresh_token: `mock-refresh-${Date.now()}`,
    },
  };
}

async function mockRefreshTokenApi(refreshToken: string): Promise<AuthTokens> {
  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    access_token: `refreshed-access-${Date.now()}`,
    refresh_token: refreshToken,
  };
}

async function mockLogoutApi(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
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
          const response = await mockLoginApi(credentials);

          set({
            user: response.user,
            accessToken: response.tokens.access_token,
            refreshTokenValue: response.tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: {
              message: error instanceof Error ? error.message : "Error al iniciar sesión",
            },
          });
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await mockRegisterApi(data);

          set({
            user: response.user,
            accessToken: response.tokens.access_token,
            refreshTokenValue: response.tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: {
              message: error instanceof Error ? error.message : "Error al registrarse",
            },
          });
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          await mockLogoutApi();

          set({
            user: null,
            accessToken: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
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
          const tokens = await mockRefreshTokenApi(currentRefreshToken);

          set({
            accessToken: tokens.access_token,
            refreshTokenValue: tokens.refresh_token,
          });
        } catch (error) {
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
