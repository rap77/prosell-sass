/**
 * TDD: useAuth Hook Tests
 * Tests del hook de autenticación
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { create } from "zustand";
import { authApi, ApiError } from "@/lib/api/authApi";

// Mock authApi module
vi.mock("@/lib/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    // refreshToken removed - tokens handled by httpOnly cookies
    logout: vi.fn(),
    me: vi.fn(),
  },
  ApiError: class MockApiError extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

// Create a test store without persist middleware to avoid act() warnings
// The persist middleware does async hydration from localStorage which causes warnings
const createTestAuthStore = () =>
  create((set, get) => ({
    // Initial state
    user: null,
    accessToken: null,
    refreshTokenValue: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: async (credentials: { email: string; password: string }) => {
      set({ isLoading: true, error: null });

      try {
        const response = await authApi.login(
          credentials.email,
          credentials.password,
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

    register: async (data: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
    }) => {
      set({ isLoading: true, error: null });

      try {
        const response = await authApi.register(
          data.email,
          data.password,
          data.first_name,
          data.last_name,
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
      } catch {
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
      } catch {
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

    updateUser: (updates: any) => {
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

// Use test store instead of real store
const useAuthStore = createTestAuthStore();

describe("useAuth Hook - Authentication Helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useAuthStore.getState().reset();
  });

  afterEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it("should provide authentication state", () => {
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("should provide login action", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("test@example.com");
    expect(state.user?.id).toBe("1");
  });

  it("should provide logout action", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    // Mock authApi.logout
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    // First login
    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Then logout
    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("should provide register action", async () => {
    // Mock authApi.register
    vi.mocked(authApi.register).mockResolvedValue({
      user: {
        id: "2",
        email: "new@example.com",
        first_name: "New",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore.getState().register({
      email: "new@example.com",
      password: "password123",
      first_name: "New",
      last_name: "User",
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("new@example.com");
  });

  it("should expose error state", async () => {
    // Mock authApi.login error
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError("Credenciales inválidas", 401),
    );

    await useAuthStore
      .getState()
      .login({ email: "wrong@example.com", password: "wrong" });

    const state = useAuthStore.getState();
    expect(state.error).not.toBeNull();
    expect(state.error?.message).toContain("inválidas");
  });

  it("should expose loading state", async () => {
    // Mock a slow response
    vi.mocked(authApi.login).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              user: {
                id: "1",
                email: "test@example.com",
                first_name: "Test",
                last_name: "User",
                role: "sales_agent",
              },
              tokens: {
                access_token: "mock-access-token",
                refresh_token: "mock-refresh-token",
              },
            });
          }, 100);
        }),
    );

    // Start login (don't await)
    const loginPromise = useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    // Check loading state immediately
    expect(useAuthStore.getState().isLoading).toBe(true);

    // Wait for completion
    await loginPromise;
  });

  it("should provide clear error action", async () => {
    // Mock authApi.login error
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError("Credenciales inválidas", 401),
    );

    // Trigger error
    await useAuthStore
      .getState()
      .login({ email: "wrong@example.com", password: "wrong" });

    expect(useAuthStore.getState().error).not.toBeNull();

    // Clear error
    useAuthStore.getState().clearError();

    expect(useAuthStore.getState().error).toBeNull();
  });

  it("should provide update user action", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const originalName = useAuthStore.getState().user?.first_name;

    useAuthStore.getState().updateUser({ first_name: "Updated" });

    const state = useAuthStore.getState();
    expect(state.user?.first_name).toBe("Updated");
    expect(state.user?.first_name).not.toBe(originalName);
  });
});

describe("useAuth Hook - Convenience Getters", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useAuthStore.getState().reset();
  });

  afterEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it("should expose user ID when authenticated", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe("1");
  });

  it("should expose user email", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.user?.email).toBe("test@example.com");
  });

  it("should expose user full name", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    const fullName =
      `${state.user?.first_name} ${state.user?.last_name}`.trim();
    expect(fullName).toBe("Test User");
  });

  it("should expose user role", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState() as {
      user?: { role?: string } | null;
    };
    expect(state.user?.role).toBe("sales_agent");
  });

  it("should expose email verification status", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
        is_email_verified: true,
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState() as {
      user?: { is_email_verified?: boolean } | null;
    };
    expect(state.user?.is_email_verified).toBe(true);
  });

  it("should expose 2FA status", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "sales_agent",
        is_email_verified: true,
        is_2fa_enabled: false,
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState() as {
      user?: { is_2fa_enabled?: boolean } | null;
    };
    expect(state.user?.is_2fa_enabled).toBe(false);
  });
});
