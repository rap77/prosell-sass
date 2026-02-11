/**
 * TDD: authApi Client Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { authApi } from "@/lib/api/authApi";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("authApi Client - Login", () => {
  beforeEach(async () => {
    // Clear call history and reset mock implementation
    mockFetch.mockReset();
    mockFetch.mockClear();

    // Clear the requestCache by calling logout (which clears the cache even on error)
    // We need to do this because login() caches results by email/password
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);
    try {
      await authApi.logout();
    } catch {
      // Ignore any errors - the cache is still cleared
    }
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    // Only clear the call history, NOT the mock implementation
    // This prevents mockRejectedValueOnce from being cleared
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/login with credentials", async () => {
    const mockResponse = {
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
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await authApi.login("test@example.com", "Password123!");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/login"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("test@example.com"),
      })
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
      authApi.login("wrong@example.com", "wrongpassword")
    ).rejects.toThrow("Invalid email or password format");
  });

  it("should handle network errors", async () => {
    // Configure mock to reject on next call
    // Use mockRejectedValueOnce which properly rejects with the error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      authApi.login("test@example.com", "Password123!")
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
      user: {
        id: "2",
        email: "new@example.com",
        first_name: "New",
        last_name: "User",
        role: "sales_user",
        is_email_verified: false,
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

    const result = await authApi.register(
      "new@example.com",
      "Password123!",
      "New",
      "User"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/register"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("new@example.com"),
      })
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
      authApi.register("existing@example.com", "Password123!", "Test", "User")
    ).rejects.toThrow("Invalid email or password format");
  });
});

describe("authApi Client - Refresh Token", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/refresh with refresh token", async () => {
    const mockResponse = {
      access_token: "new-access-token",
      refresh_token: "mock-refresh-token",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await authApi.refreshToken("mock-refresh-token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/refresh"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("mock-refresh-token"),
      })
    );

    expect(result).toEqual(mockResponse);
  });

  it("should throw error on refresh failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Token inválido" }),
    } as Response);

    await expect(
      authApi.refreshToken("invalid-token")
    ).rejects.toThrow("Token inválido");
  });
});

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
      expect.stringContaining("/api/auth/logout"),
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should handle logout errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Internal server error" }),
    } as Response);

    // Logout should throw error when API fails
    await expect(authApi.logout()).rejects.toThrow("Logout failed");

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

  it("should call GET /api/auth/me with auth header", async () => {
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

    const result = await authApi.getCurrentUser("valid-token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/me"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer valid-token",
        }),
      })
    );

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
      expect.stringContaining("/api/auth/verify-email"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("verification-token"),
      })
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
      expect.stringContaining("/api/auth/forgot-password"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("test@example.com"),
      })
    );

    expect(result).toEqual({ message: "Email enviado" });
  });
});

describe("authApi Client - Reset Password", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call POST /api/auth/reset-password with token and new password", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Contraseña actualizada" }),
    } as Response);

    const result = await authApi.resetPassword("reset-token", "NewPassword123!");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/reset-password"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("reset-token"),
      })
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
      authApi.resetPassword("invalid-token", "NewPassword123!")
    ).rejects.toThrow("Password does not meet requirements");
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

    const result = await authApi.enable2FA("access-token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/2fa/enable"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
      })
    );

    expect(result).toEqual(mockResponse);
  });

  it("should call POST /api/auth/2fa/verify", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "2FA verificado" }),
    } as Response);

    const result = await authApi.verify2FA("123456", "access-token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/2fa/verify"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
        body: expect.stringContaining("123456"),
      })
    );

    expect(result).toEqual({ message: "2FA verificado" });
  });

  it("should call POST /api/auth/2fa/disable", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "2FA deshabilitado" }),
    } as Response);

    const result = await authApi.disable2FA("access-token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/2fa/disable"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
      })
    );

    expect(result).toEqual({ message: "2FA deshabilitado" });
  });
});
