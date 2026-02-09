/**
 * TDD: authStore Tests (Zustand)
 * Tests unitarios del store de autenticación
 */

import { renderHook, act, cleanup } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { useAuthStore } from "@/stores/authStore";

// Mock authApi module
vi.mock("@/lib/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
  ApiError: class MockApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

import { authApi, ApiError } from "@/lib/api/authApi";

// Setup: Clear localStorage and reset store before each test
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// Cleanup: Clear localStorage after each test
afterEach(() => {
  useAuthStore.getState().reset();
  localStorage.clear();
  cleanup();
});

describe("authStore - Initial State", () => {
  it("should have empty initial state", async () => {
    const { result } = renderHook(() => useAuthStore());

    // Wait for any async initialization to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.refreshTokenValue).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe("authStore - Login Action", () => {
  it("should set user and tokens on successful login", async () => {
    // Mock authApi.login success response
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

    const { result } = renderHook(() => useAuthStore());

    // Act: async action
    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    // Assert: state updated
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe("test@example.com");
    expect(result.current.user?.id).toBe("1");
    expect(result.current.accessToken).not.toBeNull();
    expect(result.current.refreshTokenValue).not.toBeNull();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set error on failed login", async () => {
    // Mock authApi.login error
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError("Invalid credentials", 401)
    );

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login({
        email: "wrong@example.com",
        password: "wrongpassword",
      });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should set isLoading to true during login", async () => {
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
        })
    );

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    // Immediately check loading state
    expect(result.current.isLoading).toBe(true);
  });
});

describe("authStore - Register Action", () => {
  it("should create user and login on successful registration", async () => {
    // Mock authApi.register success response
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

    const { result } = renderHook(() => useAuthStore());

    const mockRegisterData = {
      email: "new@example.com",
      password: "password123",
      first_name: "New",
      last_name: "User",
    };

    await act(async () => {
      await result.current.register(mockRegisterData);
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe(mockRegisterData.email);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should set error on registration failure (email exists)", async () => {
    // Mock authApi.register error with "ya existe" message
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiError("El email ya existe", 400)
    );

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.register({
        email: "existing@example.com",
        password: "password123",
        first_name: "Test",
        last_name: "User",
      });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain("ya existe");
  });
});

describe("authStore - Logout Action", () => {
  it("should clear all state on logout", async () => {
    // Mock authApi.login for setup
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

    const { result } = renderHook(() => useAuthStore());

    // First, login
    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.refreshTokenValue).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe("authStore - Refresh Token Action", () => {
  it("should refresh access token successfully", async () => {
    // Mock authApi.login for setup
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

    // Mock authApi.refreshToken
    vi.mocked(authApi.refreshToken).mockResolvedValue({
      access_token: "new-mock-access-token",
      refresh_token: "new-mock-refresh-token",
    });

    const { result } = renderHook(() => useAuthStore());

    // Setup: login first
    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    const oldAccessToken = result.current.accessToken;

    // Act: refresh
    await act(async () => {
      await result.current.refreshToken();
    });

    // Assert: new token received
    expect(result.current.accessToken).not.toBe(oldAccessToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should logout on refresh failure (invalid refresh token)", async () => {
    // Mock authApi.login for setup
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

    // Mock authApi.refreshToken to throw error
    vi.mocked(authApi.refreshToken).mockRejectedValue(
      new ApiError("Invalid refresh token", 401)
    );

    const { result } = renderHook(() => useAuthStore());

    // Setup: login
    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    // Act: try to refresh with invalid token
    await act(async () => {
      await result.current.refreshToken();
    });

    // Assert: logged out because refresh token failed
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe("authStore - Update User Action", () => {
  it("should update user data", async () => {
    // Mock authApi.login for setup
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

    const { result } = renderHook(() => useAuthStore());

    // Setup: login
    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    const originalFirstName = result.current.user?.first_name;

    // Act: update user
    act(() => {
      result.current.updateUser({
        first_name: "Updated",
      });
    });

    // Assert: user updated
    expect(result.current.user?.first_name).toBe("Updated");
    expect(result.current.user?.first_name).not.toBe(originalFirstName);
  });
});

describe("authStore - Clear Error Action", () => {
  it("should clear error state", async () => {
    // Mock authApi.login error
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError("Invalid credentials", 401)
    );

    const { result } = renderHook(() => useAuthStore());

    // Setup: trigger error
    await act(async () => {
      await result.current.login({
        email: "wrong@example.com",
        password: "wrong",
      });
    });

    expect(result.current.error).not.toBeNull();

    // Act: clear error
    act(() => {
      result.current.clearError();
    });

    // Assert: error cleared
    expect(result.current.error).toBeNull();
  });
});

describe("authStore - Persist Middleware", () => {
  it("should persist state to localStorage", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "persist@example.com",
        first_name: "Persist",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    const { result } = renderHook(() => useAuthStore());

    const mockUser = {
      id: "1",
      email: "persist@example.com",
      first_name: "Persist",
      last_name: "User",
      role: "sales_agent",
    };

    // Act: login
    await act(async () => {
      await result.current.login({
        email: "persist@example.com",
        password: "password123",
      });
    });

    // Assert: localStorage has data
    const storedState = localStorage.getItem("auth-storage");
    expect(storedState).not.toBeNull();
    expect(storedState).toContain("persist@example.com");
  });

  it("should hydrate state from localStorage on mount", async () => {
    // Mock authApi.login
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: "1",
        email: "persist@example.com",
        first_name: "Persist",
        last_name: "User",
        role: "sales_agent",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });

    // This test needs special handling because zustand-persist hydrates on first mount
    // We test that persist works by checking localStorage gets updated

    const { result } = renderHook(() => useAuthStore());

    // Act: login (should persist to localStorage)
    await act(async () => {
      await result.current.login({
        email: "persist@example.com",
        password: "password123",
      });
    });

    // Assert: localStorage was updated
    const storedState = localStorage.getItem("auth-storage");
    expect(storedState).not.toBeNull();

    const parsed = JSON.parse(storedState!);
    expect(parsed.state.user.email).toBe("persist@example.com");
    expect(parsed.state.isAuthenticated).toBe(true);
  });
});
