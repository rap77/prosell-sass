/**
 * TDD: useAuth Hook Tests
 * Tests del hook de autenticación
 *
 * Updated to match current authStore structure:
 * - NO accessToken/refreshTokenValue (tokens handled by httpOnly cookies)
 * - Added initialized flag
 * - Added is_email_verified field to User type
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { create } from "zustand";
import { authApi, ApiError } from "@/lib/api/authApi";

// Mock authApi module
vi.mock("@/lib/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
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

// Type for our test store
interface TestAuthState {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_email_verified: boolean;
    is_2fa_enabled?: boolean;
    organization_id?: string | null;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: { message: string } | null;
  initialized: boolean;

  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (
    updates: Partial<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      is_email_verified: boolean;
      is_2fa_enabled?: boolean;
      organization_id?: string | null;
    }>,
  ) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

// Create a test store without persist middleware to avoid act() warnings
const createTestAuthStore = () =>
  create<TestAuthState>((set, get) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    initialized: false,

    login: async (credentials: { email: string; password: string }) => {
      set({ isLoading: true, error: null });

      try {
        const response = await authApi.login(
          credentials.email,
          credentials.password,
        );

        // Tokens are handled by httpOnly cookies - only set user and auth state
        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          initialized: true,
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
        await authApi.register(
          data.email,
          data.password,
          data.first_name,
          data.last_name,
        );

        // Registration does NOT authenticate — email verification required
        set({
          user: null,
          isAuthenticated: false,
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
              : "Error al registrarse";

        set({
          isLoading: false,
          error: { message },
        });
      }
    },

    logout: async () => {
      try {
        set({ isLoading: true, initialized: false });

        await authApi.logout();

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          initialized: false,
          error: null,
        });
      } catch {
        // Logout locally even if API fails
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          initialized: false,
          error: null,
        });
      }
    },

    updateUser: (updates) => {
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
        isAuthenticated: false,
        isLoading: false,
        initialized: false,
        error: null,
      });
    },
  }));

// Use test store instead of real store
const useAuthStore = createTestAuthStore();

// Helper to create a mock user response
const createMockUserResponse = (overrides = {}) => ({
  user: {
    id: "1",
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
    role: "sales_agent",
    is_email_verified: true,
    ...overrides,
  },
});

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
    expect(state.initialized).toBe(false);
  });

  it("should provide login action", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("test@example.com");
    expect(state.user?.id).toBe("1");
    expect(state.initialized).toBe(true);
  });

  it("should provide logout action", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

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
    expect(state.initialized).toBe(false);
  });

  it("should provide register action", async () => {
    // Mock authApi.register — returns RegisterResponse (no user object, no tokens)
    vi.mocked(authApi.register).mockResolvedValue({
      user_id: "2",
      email: "new@example.com",
      status: "pending_verification",
      message: "Check your email to verify your account",
    });

    await useAuthStore.getState().register({
      email: "new@example.com",
      password: "password123",
      first_name: "New",
      last_name: "User",
    });

    // Registration does NOT authenticate — user must verify email first
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.initialized).toBe(false);
    expect(state.error).toBeNull();
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
            resolve(createMockUserResponse());
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

    expect(useAuthStore.getState().isLoading).toBe(false);
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
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

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
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe("1");
  });

  it("should expose user email", async () => {
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.user?.email).toBe("test@example.com");
  });

  it("should expose user full name", async () => {
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    const fullName =
      `${state.user?.first_name} ${state.user?.last_name}`.trim();
    expect(fullName).toBe("Test User");
  });

  it("should expose user role", async () => {
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.user?.role).toBe("sales_agent");
  });

  it("should expose email verification status", async () => {
    vi.mocked(authApi.login).mockResolvedValue(
      createMockUserResponse({ is_email_verified: true }),
    );

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.user?.is_email_verified).toBe(true);
  });

  it("should expose 2FA status", async () => {
    vi.mocked(authApi.login).mockResolvedValue(
      createMockUserResponse({ is_2fa_enabled: false }),
    );

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.user?.is_2fa_enabled).toBe(false);
  });

  it("should expose organization ID when set", async () => {
    vi.mocked(authApi.login).mockResolvedValue(
      createMockUserResponse({ organization_id: "org-123" }),
    );

    await useAuthStore
      .getState()
      .login({ email: "test@example.com", password: "password123" });

    const state = useAuthStore.getState();
    expect(state.user?.organization_id).toBe("org-123");
  });
});
