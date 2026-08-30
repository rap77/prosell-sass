/**
 * Unit test for the session-expiry redirect in `fetchWithAuth`.
 *
 * Scoped regression for FR2.1 / Step 5 of the auth-navigation-refactor Unit:
 * the `@next/next/no-location-assign-relative-destination` suppressor around
 * `window.location.href = "/auth/login"` was removed by wrapping the literal
 * in `buildSessionExpiredRedirectPath()`. This test proves that refactor did
 * not change where the browser is redirected to when a token refresh fails.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

describe("fetchWithAuth — session expiry redirect", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { href: "http://localhost:3000/dashboard" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects to /auth/login when the refresh call fails after a 401", async () => {
    fetchMock
      // Original request → 401
      .mockResolvedValueOnce({ status: 401 } as Response)
      // /api/auth/refresh → not ok (refresh failed, session truly expired)
      .mockResolvedValueOnce({ ok: false } as Response);

    await fetchWithAuth("/api/v1/products");

    expect(window.location.href).toBe("/auth/login");
  });

  it("does not redirect when the refresh call succeeds", async () => {
    fetchMock
      // Original request → 401
      .mockResolvedValueOnce({ status: 401 } as Response)
      // /api/auth/refresh → ok (refresh succeeded)
      .mockResolvedValueOnce({ ok: true } as Response)
      // Retried original request → 200
      .mockResolvedValueOnce({ status: 200, ok: true } as Response);

    await fetchWithAuth("/api/v1/products");

    expect(window.location.href).toBe("http://localhost:3000/dashboard");
  });
});
