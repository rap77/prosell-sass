/**
 * TDD: Cookie Utilities Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the cookies module
const mockCookiesGet = vi.fn();
const mockCookiesSet = vi.fn();
const mockCookiesDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
    delete: mockCookiesDelete,
  })),
}));

import { setCookie, getCookie, deleteCookie, hasCookie, setAuthCookies, getAuthCookies, deleteAuthCookies, AUTH_COOKIES } from "@/lib/auth/cookies";

describe("Cookie Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setCookie", () => {
    it("should set a cookie with default options", async () => {
      await setCookie("test", "value");

      expect(mockCookiesSet).toHaveBeenCalledWith(
        "test",
        "value",
        expect.objectContaining({
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
          httpOnly: true,
          secure: false, // false in test env
          sameSite: "lax",
        })
      );
    });

    it("should set a cookie with custom options", async () => {
      await setCookie("test", "value", {
        maxAge: 3600,
        path: "/custom",
        httpOnly: false,
      });

      expect(mockCookiesSet).toHaveBeenCalledWith(
        "test",
        "value",
        expect.objectContaining({
          maxAge: 3600,
          path: "/custom",
          httpOnly: false,
        })
      );
    });
  });

  describe("getCookie", () => {
    it("should return cookie value when cookie exists", async () => {
      mockCookiesGet.mockReturnValue({ value: "cookie-value", name: "test" });

      const value = await getCookie("test");

      expect(value).toBe("cookie-value");
      expect(mockCookiesGet).toHaveBeenCalledWith("test");
    });

    it("should return undefined when cookie does not exist", async () => {
      mockCookiesGet.mockReturnValue(undefined);

      const value = await getCookie("test");

      expect(value).toBeUndefined();
    });
  });

  describe("deleteCookie", () => {
    it("should delete the cookie", async () => {
      await deleteCookie("test");

      expect(mockCookiesDelete).toHaveBeenCalledWith("test");
    });
  });

  describe("hasCookie", () => {
    it("should return true when cookie exists", async () => {
      mockCookiesGet.mockReturnValue({ value: "value", name: "test" });

      const hasIt = await hasCookie("test");

      expect(hasIt).toBe(true);
    });

    it("should return false when cookie does not exist", async () => {
      mockCookiesGet.mockReturnValue(undefined);

      const hasIt = await hasCookie("test");

      expect(hasIt).toBe(false);
    });
  });

  describe("setAuthCookies", () => {
    it("should set all auth cookies with correct options", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "user",
        is_email_verified: true,
        is_2fa_enabled: false,
      };

      await setAuthCookies({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: mockUser,
      });

      // Verify access token cookie (15 minutes)
      expect(mockCookiesSet).toHaveBeenCalledWith(
        AUTH_COOKIES.ACCESS_TOKEN,
        "access-token",
        expect.objectContaining({
          maxAge: 60 * 15,
          httpOnly: true,
        })
      );

      // Verify refresh token cookie (7 days)
      expect(mockCookiesSet).toHaveBeenCalledWith(
        AUTH_COOKIES.REFRESH_TOKEN,
        "refresh-token",
        expect.objectContaining({
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: true,
        })
      );

      // Verify user data cookie (non-httpOnly for client access)
      expect(mockCookiesSet).toHaveBeenCalledWith(
        AUTH_COOKIES.USER_DATA,
        JSON.stringify(mockUser),
        expect.objectContaining({
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: false,
        })
      );
    });
  });

  describe("getAuthCookies", () => {
    it("should return all auth cookies when they exist", async () => {
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === AUTH_COOKIES.ACCESS_TOKEN) return { value: "access-token", name };
        if (name === AUTH_COOKIES.REFRESH_TOKEN) return { value: "refresh-token", name };
        if (name === AUTH_COOKIES.USER_DATA) return { value: '{"id":"123"}', name };
        return undefined;
      });

      const result = await getAuthCookies();

      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        userData: { id: "123" },
      });
    });

    it("should return empty object when cookies do not exist", async () => {
      mockCookiesGet.mockReturnValue(undefined);

      const result = await getAuthCookies();

      expect(result).toEqual({
        accessToken: undefined,
        refreshToken: undefined,
        userData: undefined,
      });
    });

    it("should handle malformed user data cookie", async () => {
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === AUTH_COOKIES.USER_DATA) return { value: "invalid-json", name };
        return undefined;
      });

      const result = await getAuthCookies();

      expect(result.userData).toBeUndefined();
    });
  });

  describe("deleteAuthCookies", () => {
    it("should delete all auth cookies", async () => {
      await deleteAuthCookies();

      expect(mockCookiesDelete).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN);
      expect(mockCookiesDelete).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN);
      expect(mockCookiesDelete).toHaveBeenCalledWith(AUTH_COOKIES.USER_DATA);
    });
  });
});
