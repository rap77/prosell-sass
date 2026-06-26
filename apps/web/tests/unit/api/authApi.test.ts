/**
 * TDD: authApi Client Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { authApi } from "@/lib/api/authApi";
import { createAuthCacheKey } from "@/lib/cache/cache-utils";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("authApi Client - Login", () => {
  beforeEach(async () => {
    // Clear all mocks and cache
    mockFetch.mockReset();
    mockFetch.mockClear();

    // Clear the API cache completely
    authApi.clearAllCache();
  });

  afterEach(() => {
    // Clear call history after each test
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/login with credentials", async () => {
    const mockResponse = {
      user: {
        id: "1",
        email: "test@example.com",
        full_name: "Test User",
        roles: ["sales_agent"],
        tenant_id: "tenant-1",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await authApi.login("test@example.com", "Password123!");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/login"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("test@example.com"),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should throw error on login failure (401)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid email or password format" }),
    } as Response);

    await expect(
      authApi.login("wrong@example.com", "wrongpassword"),
    ).rejects.toThrow("Invalid email or password format");
  });

  it("should handle network errors", async () => {
    // Configure mock to reject on next call
    // Use mockRejectedValueOnce which properly rejects with the error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      authApi.login("test@example.com", "Password123!"),
    ).rejects.toThrow("Network error");
  });
});

describe("authApi Client - Register", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/register with user data", async () => {
    const mockResponse = {
      user_id: "2",
      email: "new@example.com",
      status: "pending_verification",
      message: "Registration successful",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await authApi.register(
      "new@example.com",
      "Password123!",
      "New",
      "User",
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/register"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("new@example.com"),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should throw error on registration failure (email exists)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Invalid email or password format" }),
    } as Response);

    await expect(
      authApi.register("existing@example.com", "Password123!", "Test", "User"),
    ).rejects.toThrow("Invalid email or password format");
  });
});

// Refresh token tests removed - tokens handled by httpOnly cookies server-side
// Client-side refresh is no longer needed

describe("authApi Client - Logout", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/logout", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    await authApi.logout();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/logout"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should handle logout errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Internal server error" }),
    } as Response);

    // Logout should NOT throw - it clears local cache and ignores API errors
    await expect(authApi.logout()).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("authApi Client - Get Current User", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call GET /api/auth/me with credentials", async () => {
    const mockResponse = {
      id: "1",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "sales_agent",
      is_email_verified: true,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await authApi.getCurrentUser();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/me"),
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );

    // Verify the call includes credentials but does NOT include Authorization header
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1]).toBeDefined();
    expect(fetchCall[1].credentials).toBe("include");
    // If headers exist, ensure Authorization is not present
    if (fetchCall[1].headers) {
      expect(fetchCall[1].headers).not.toHaveProperty("Authorization");
    }

    expect(result).toEqual(mockResponse);
  });
});

describe("authApi Client - Verify Email", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/verify-email with token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Email verificado" }),
    } as Response);

    const result = await authApi.verifyEmail("verification-token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/verify-email"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("verification-token"),
      }),
    );

    expect(result).toEqual({ message: "Email verificado" });
  });
});

describe("authApi Client - Forgot Password", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/forgot-password with email", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Email enviado" }),
    } as Response);

    const result = await authApi.forgotPassword("test@example.com");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/forgot-password"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("test@example.com"),
      }),
    );

    expect(result).toEqual({ message: "Email enviado" });
  });
});

describe("authApi Client - Reset Password", () => {
  beforeEach(() => {
    // Clear all mocks and cache
    mockFetch.mockReset();
    mockFetch.mockClear();
    authApi.clearAllCache();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/reset-password with token and new password", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Contraseña actualizada" }),
    } as Response);

    const result = await authApi.resetPassword(
      "reset-token",
      "NewPassword123!",
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/reset-password"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("reset-token"),
      }),
    );

    expect(result).toEqual({ message: "Contraseña actualizada" });
  });

  it("should throw error on invalid reset token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Password does not meet requirements" }),
    } as Response);

    await expect(
      authApi.resetPassword("invalid-token", "NewPassword123!"),
    ).rejects.toThrow("Password does not meet requirements");
  });
});

describe("authApi - mutation caching", () => {
  beforeEach(async () => {
    // Clear all mocks and cache
    mockFetch.mockReset();
    mockFetch.mockClear();

    // Clear the API cache completely
    authApi.clearAllCache();
  });

  afterEach(() => {
    // Clear call history after each test
    mockFetch.mockClear();
  });

  it("should NOT cache login response (mutation)", async () => {
    let callCount = 0;
    const mockResponse = {
      user: {
        id: "1",
        email: "test@test.com",
        full_name: "Test User",
        roles: ["user"],
        tenant_id: "tenant-1",
      },
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    };

    mockFetch.mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => mockResponse,
      } as Response;
    });

    // Two identical calls with valid password
    await authApi.login("test@test.com", "Password123!");
    await authApi.login("test@test.com", "Password123!");

    // Mutations should NOT be cached - each call should hit the API
    expect(callCount).toBe(2);
  });

  it("should NOT cache register response (mutation)", async () => {
    let callCount = 0;
    const mockResponse = {
      user_id: "2",
      email: "new@test.com",
      status: "pending_verification",
      message: "Registration successful",
    };

    mockFetch.mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => mockResponse,
      } as Response;
    });

    // Two identical calls with valid password
    await authApi.register("new@test.com", "Password123!", "New", "User");
    await authApi.register("new@test.com", "Password123!", "New", "User");

    // Mutations should NOT be cached - each call should hit the API
    expect(callCount).toBe(2);
  });
});

describe("authApi - cache security", () => {
  it("should NOT include password in cache key", () => {
    const credentials = {
      email: "test@example.com",
      password: "SecretPassword123!",
    };

    // Act: Create cache key for login
    const cacheKey = createAuthCacheKey("login", credentials);

    // Assert: Password should NOT be in the cache key
    expect(cacheKey).not.toContain("SecretPassword123!");
    expect(cacheKey).not.toContain("password");
  });

  it("should NOT include newPassword in cache key", () => {
    const resetData = {
      token: "reset-token-123",
      newPassword: "NewSecret456!",
    };

    const cacheKey = createAuthCacheKey("reset-password", resetData);

    expect(cacheKey).not.toContain("NewSecret456!");
    expect(cacheKey).not.toContain("newPassword");
  });

  it("should NOT include accessToken in cache key", () => {
    const twoFactorData = {
      code: "123456",
      accessToken: "secret-token-xyz",
    };

    const cacheKey = createAuthCacheKey("2fa/verify", twoFactorData);

    expect(cacheKey).not.toContain("secret-token-xyz");
    expect(cacheKey).not.toContain("accessToken");
  });
});

describe("authApi Client - 2FA Operations", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/2fa/enable", async () => {
    const mockResponse = {
      qr_code: "data:image/png;base64,mockqr",
      backup_codes: ["123456", "789012"],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await authApi.enable2FA();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/2fa/enable"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    // Verify the call includes credentials but does NOT include Authorization header
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1]).toBeDefined();
    expect(fetchCall[1].credentials).toBe("include");
    // If headers exist, ensure Authorization is not present
    if (fetchCall[1].headers) {
      expect(fetchCall[1].headers).not.toHaveProperty("Authorization");
    }

    expect(result).toEqual(mockResponse);
  });

  it("should call POST /api/auth/2fa/verify", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "2FA verificado" }),
    } as Response);

    const result = await authApi.verify2FA("123456");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/2fa/verify"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: expect.stringContaining("123456"),
      }),
    );

    // Verify the call includes credentials but does NOT include Authorization header
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1]).toBeDefined();
    expect(fetchCall[1].credentials).toBe("include");
    // If headers exist, ensure Authorization is not present
    if (fetchCall[1].headers) {
      expect(fetchCall[1].headers).not.toHaveProperty("Authorization");
    }

    expect(result).toEqual({ message: "2FA verificado" });
  });

  it("should call POST /api/auth/2fa/disable", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "2FA deshabilitado" }),
    } as Response);

    const result = await authApi.disable2FA();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/2fa/disable"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    // Verify the call includes credentials but does NOT include Authorization header
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1]).toBeDefined();
    expect(fetchCall[1].credentials).toBe("include");
    // If headers exist, ensure Authorization is not present
    if (fetchCall[1].headers) {
      expect(fetchCall[1].headers).not.toHaveProperty("Authorization");
    }

    expect(result).toEqual({ message: "2FA deshabilitado" });
  });
});
