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
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
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

    const result = await authApi.login("test@example.com", "password123");

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
      json: async () => ({ detail: "Credenciales inválidas" }),
    } as Response);

    await expect(
      authApi.login("wrong@example.com", "wrongpassword")
    ).rejects.toThrow("Credenciales inválidas");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      authApi.login("test@example.com", "password123")
    ).rejects.toThrow("Network error");
  });
});

describe("authApi Client - Register", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
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
      "password123",
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
      json: async () => ({ detail: "El email ya existe" }),
    } as Response);

    await expect(
      authApi.register("existing@example.com", "password123", "Test", "User")
    ).rejects.toThrow("El email ya existe");
  });
});

describe("authApi Client - Refresh Token", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
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
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
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
      status: 401,
      json: async () => ({ detail: "Sesión expirada" }),
    } as Response);

    // Logout should not throw even if API fails
    await authApi.logout();

    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("authApi Client - Get Current User", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
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

  it("should throw error when not authenticated", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "No autenticado" }),
    } as Response);

    await expect(
      authApi.getCurrentUser("invalid-token")
    ).rejects.toThrow("No autenticado");
  });
});

describe("authApi Client - Verify Email", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
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
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
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
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it("should call POST /api/auth/reset-password with token and new password", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Contraseña actualizada" }),
    } as Response);

    const result = await authApi.resetPassword("reset-token", "newpassword123");

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
      json: async () => ({ detail: "Token inválido o expirado" }),
    } as Response);

    await expect(
      authApi.resetPassword("invalid-token", "newpassword123")
    ).rejects.toThrow("Token inválido o expirado");
  });
});

describe("authApi Client - 2FA Operations", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
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
