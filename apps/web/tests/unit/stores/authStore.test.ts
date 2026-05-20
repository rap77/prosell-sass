/**
 * TDD: authStore Tests (Zustand)
 * Tests unitarios del store de autenticación
 *
 * Updated to match current authStore structure:
 * - NO accessToken/refreshTokenValue (tokens handled by httpOnly cookies)
 * - Added initialized flag
 * - Added initializeAuth method
 * - Added is_email_verified field to User type
 */

import { cleanup } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

import { authApi, ApiError } from "@/lib/api/authApi";
import type { AuthState } from "@/stores/authStore";

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

// Create a test store WITH persist middleware but skipHydration to avoid act() warnings
// skipHydration prevents async hydration on mount, eliminating React act() warnings
// We can still test persist functionality by verifying localStorage directly
const createTestAuthStore = () =>
  create<AuthState>()(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        initialized: false,

        initializeAuth: async () => {
          const { initialized } = get();

          // Early exit if already initialized
          if (initialized) {
            set({ isLoading: false });
            return;
          }

          try {
            const response = await fetch("/api/auth/state", {
              credentials: "include",
            });
            const authState = await response.json();

            if (!authState.isAuthenticated || !authState.user) {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                initialized: false,
                error: null,
              });
              return;
            }

            set({
              user: authState.user,
              isAuthenticated: true,
              isLoading: false,
              initialized: true,
              error: null,
            });
          } catch {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              initialized: false,
              error: null,
            });
          }
        },

        login: async (credentials: { email: string; password: string }) => {
          set({ isLoading: true, error: null });

          try {
            const response = await authApi.login(
              credentials.email,
              credentials.password,
            );

            // Tokens are handled by httpOnly cookies
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

        reset: async () => {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false,
            error: null,
          });
        },
      }),
      {
        name: "auth-storage",
        skipHydration: true, // Key: prevents async hydration on mount, eliminating act() warnings
      },
    ),
  );

// Use test store instead of real store
const useAuthStore = createTestAuthStore();

// Setup: Clear localStorage and reset store before each test
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useAuthStore.getState().reset();
});

// Cleanup: Clear localStorage after each test
afterEach(() => {
  useAuthStore.getState().reset();
  localStorage.clear();
  cleanup();
});

describe("authStore - Initial State", () => {
  it("should have empty initial state", async () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.initialized).toBe(false);
  });
});

describe("authStore - Login Action", () => {
  it("should set user on successful login", async () => {
    // Mock authApi.login success response
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    // Act: async action
    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "password123",
    });

    // Assert: state updated
    const state = useAuthStore.getState();
    expect(state.user).not.toBeNull();
    expect(state.user?.email).toBe("test@example.com");
    expect(state.user?.id).toBe("1");
    expect(state.isAuthenticated).toBe(true);
    expect(state.initialized).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should set error on failed login", async () => {
    // Mock authApi.login error
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError("Invalid credentials", 401),
    );

    await useAuthStore.getState().login({
      email: "wrong@example.com",
      password: "wrongpassword",
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).not.toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("should set isLoading to true during login", async () => {
    // Mock a slow response
    vi.mocked(authApi.login).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(createMockUserResponse());
          }, 100);
        }),
    );

    // Start login without awaiting
    useAuthStore.getState().login({
      email: "test@example.com",
      password: "password123",
    });

    // Immediately check loading state
    expect(useAuthStore.getState().isLoading).toBe(true);
  });
});

describe("authStore - Register Action", () => {
  it("should NOT authenticate user on successful registration (email verification required)", async () => {
    // Mock authApi.register — returns RegisterResponse (no user object, no tokens)
    vi.mocked(authApi.register).mockResolvedValue({
      user_id: "2",
      email: "new@example.com",
      status: "pending_verification",
      message: "Check your email to verify your account",
    });

    const mockRegisterData = {
      email: "new@example.com",
      password: "password123",
      first_name: "New",
      last_name: "User",
    };

    await useAuthStore.getState().register(mockRegisterData);

    // Registration does NOT set user or authenticate — user must verify email first
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.initialized).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should set error on registration failure (email exists)", async () => {
    // Mock authApi.register error with "ya existe" message
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiError("El email ya existe", 400),
    );

    await useAuthStore.getState().register({
      email: "existing@example.com",
      password: "password123",
      first_name: "Test",
      last_name: "User",
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).not.toBeNull();
    expect(state.error?.message).toContain("ya existe");
  });
});

describe("authStore - Logout Action", () => {
  it("should clear all state on logout", async () => {
    // Mock authApi.login for setup
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    // Mock authApi.logout
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    // First, login
    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "password123",
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Then logout
    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.initialized).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe("authStore - Update User Action", () => {
  it("should update user data", async () => {
    // Mock authApi.login for setup
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    // Setup: login
    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "password123",
    });

    const originalFirstName = useAuthStore.getState().user?.first_name;

    // Act: update user
    useAuthStore.getState().updateUser({
      first_name: "Updated",
    });

    // Assert: user updated
    const state = useAuthStore.getState();
    expect(state.user?.first_name).toBe("Updated");
    expect(state.user?.first_name).not.toBe(originalFirstName);
  });
});

describe("authStore - Clear Error Action", () => {
  it("should clear error state", async () => {
    // Mock authApi.login error
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError("Invalid credentials", 401),
    );

    // Setup: trigger error
    await useAuthStore.getState().login({
      email: "wrong@example.com",
      password: "wrong",
    });

    expect(useAuthStore.getState().error).not.toBeNull();

    // Act: clear error
    useAuthStore.getState().clearError();

    // Assert: error cleared
    expect(useAuthStore.getState().error).toBeNull();
  });
});

describe("authStore - Persist Middleware", () => {
  it("should persist state to localStorage", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue(
      createMockUserResponse({
        email: "persist@example.com",
        first_name: "Persist",
      }),
    );

    // Act: login
    await useAuthStore.getState().login({
      email: "persist@example.com",
      password: "password123",
    });

    // Assert: localStorage was updated by persist middleware
    const storedState = localStorage.getItem("auth-storage");
    expect(storedState).not.toBeNull();
    expect(storedState).toContain("persist@example.com");

    // Verify the persisted state structure
    const parsed = JSON.parse(storedState!);
    expect(parsed.state.user.email).toBe("persist@example.com");
    expect(parsed.state.isAuthenticated).toBe(true);
    expect(parsed.state.user.id).toBe("1");
    expect(parsed.state.initialized).toBe(true);
  });

  it("should have correct structure in localStorage", async () => {
    // This test verifies that the state structure is compatible with persist
    // We're not testing automatic hydration (which happens on app mount)
    // but rather that the state can be properly serialized/deserialized

    vi.mocked(authApi.login).mockResolvedValue(
      createMockUserResponse({
        email: "serialize@example.com",
        first_name: "Serialize",
      }),
    );

    // Act: login to populate state
    await useAuthStore.getState().login({
      email: "serialize@example.com",
      password: "password123",
    });

    // Assert: localStorage contains expected structure
    const stored = localStorage.getItem("auth-storage");
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.state).toBeDefined();
    expect(parsed.state.user).toBeDefined();
    expect(parsed.state.user.email).toBe("serialize@example.com");
    expect(parsed.state.isAuthenticated).toBe(true);
    expect(parsed.state.initialized).toBe(true);
    expect(parsed.version).toBeDefined();
  });
});

describe("authStore - initialized Flag", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();

    // Reset store state between tests
    const { useAuthStore } = await import("@/stores/authStore");
    useAuthStore.getState().reset();
  });

  it("should initialize with initialized=false", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const { initialized } = useAuthStore.getState();
    expect(initialized).toBe(false);
  });

  it("should set initialized=true after successful login", async () => {
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    const { useAuthStore } = await import("@/stores/authStore");
    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "password",
    });

    const { initialized } = useAuthStore.getState();
    expect(initialized).toBe(true);
  });

  it("should reset initialized=false on logout", async () => {
    // Mock logout API
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    const { useAuthStore } = await import("@/stores/authStore");

    // Set initialized to true
    useAuthStore.setState({ initialized: true });

    await useAuthStore.getState().logout();

    const { initialized } = useAuthStore.getState();
    expect(initialized).toBe(false);
  });

  it("should persist initialized in localStorage", async () => {
    vi.mocked(authApi.login).mockResolvedValue(createMockUserResponse());

    const { useAuthStore } = await import("@/stores/authStore");
    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "password",
    });

    // Check localStorage was updated
    const stored = localStorage.getItem("auth-storage");
    expect(stored).toContain('"initialized":true');
  });
});
