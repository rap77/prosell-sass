/**
 * TDD: authStore.logout() — relative-URL regression guard.
 *
 * logout() must clear auth cookies via the same-origin Next.js route
 * (`/api/auth/state`), exactly like initializeAuth() does — not via an
 * absolute `NEXT_PUBLIC_API_URL` host, which is the backend's origin and
 * does not expose this route at all.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    me: vi.fn(),
  },
  ApiError: class MockApiError extends Error {},
}));

import { useAuthStore } from "@/stores/authStore";

describe("authStore.logout() cookie cleanup", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("deletes auth cookies via a relative same-origin request", async () => {
    await useAuthStore.getState().logout();

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/state",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
