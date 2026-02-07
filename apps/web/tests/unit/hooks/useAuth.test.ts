/**
 * TDD: useAuth Hook Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";

describe("useAuth Hook - Authentication Helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().reset();
  });

  afterEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it("should provide authentication state", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.userEmail).toBeNull();
    expect(result.current.userFullName).toBeNull();
  });

  it("should provide login action", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userEmail).toBe("test@example.com");
    expect(result.current.userId).toBe("1");
  });

  it("should provide logout action", async () => {
    const { result } = renderHook(() => useAuth());

    // First login
    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("should provide register action", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register(
        "new@example.com",
        "password123",
        "New",
        "User"
      );
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userEmail).toBe("new@example.com");
  });

  it("should provide refresh token action", async () => {
    const { result } = renderHook(() => useAuth());

    // First login
    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    const oldToken = result.current.accessToken;

    // Refresh
    await act(async () => {
      await result.current.refreshToken();
    });

    expect(result.current.accessToken).not.toBe(oldToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should expose error state", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("wrong@example.com", "wrong");
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain("inválidas");
  });

  it("should expose loading state", async () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login("test@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("should provide clear error action", async () => {
    const { result } = renderHook(() => useAuth());

    // Trigger error
    await act(async () => {
      await result.current.login("wrong@example.com", "wrong");
    });

    expect(result.current.error).not.toBeNull();

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("should provide update user action", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    const originalName = result.current.user?.first_name;

    act(() => {
      result.current.updateUser({
        first_name: "Updated",
      });
    });

    expect(result.current.user?.first_name).toBe("Updated");
    expect(result.current.user?.first_name).not.toBe(originalName);
  });
});

describe("useAuth Hook - Convenience Getters", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().reset();
  });

  afterEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it("should expose user ID when authenticated", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.userId).toBe("1");
  });

  it("should expose user email", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.userEmail).toBe("test@example.com");
  });

  it("should expose user full name", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.userFullName).toBe("Test User");
  });

  it("should expose user role", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.userRole).toBe("sales_agent");
  });

  it("should expose email verification status", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.isEmailVerified).toBe(true);
  });

  it("should expose 2FA status", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    // Mock user has 2FA disabled by default
    expect(result.current.is2FAEnabled).toBe(false);
  });
});
