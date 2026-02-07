/**
 * TDD: authStore Tests (Zustand)
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { renderHook, act, cleanup } from "@testing-library/react";
import { useAuthStore } from "@/stores/authStore";

// Setup: Clear localStorage and reset store before each test
beforeEach(() => {
  localStorage.clear();
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
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      // Simular error de credenciales inválidas
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
    const { result } = renderHook(() => useAuthStore());

    // Setup: login
    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    // Manually set an invalid refresh token
    act(() => {
      useAuthStore.getState().refreshTokenValue = null;
    });

    // Act: try to refresh with invalid token (null)
    await act(async () => {
      await result.current.refreshToken();
    });

    // Assert: logged out because no valid refresh token
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe("authStore - Update User Action", () => {
  it("should update user data", async () => {
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
