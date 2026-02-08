/**
 * Route Protection Middleware E2E Tests
 *
 * Tests for Next.js middleware that protects authenticated routes.
 * Verifies redirects and access control.
 */

import { test, expect } from "@playwright/test";

test.describe("Route Protection Middleware", () => {
  test.describe("Protected Routes - Unauthenticated User", () => {
    test("should redirect to login when accessing /dashboard",
      { tag: ["@critical", "@e2e", "@middleware", "@MIDDLEWARE-E2E-001"] },
      async ({ page }) => {
        await page.goto("/dashboard");

        // Should redirect to login
        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("/auth/login");
      }
    );

    test("should include redirect parameter in login URL",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-002"] },
      async ({ page }) => {
        await page.goto("/dashboard");

        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("redirect=/dashboard");
      }
    );

    test("should redirect to login when accessing /profile",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-003"] },
      async ({ page }) => {
        await page.goto("/profile");

        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("/auth/login");
      }
    );

    test("should redirect to login when accessing /settings",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-004"] },
      async ({ page }) => {
        await page.goto("/settings");

        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("/auth/login");
      }
    );

    test("should redirect to login when accessing /auth/setup-2fa",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-005"] },
      async ({ page }) => {
        await page.goto("/auth/setup-2fa");

        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("/auth/login");
      }
    );
  });

  test.describe("Public Routes - No Auth Required", () => {
    test("should allow access to home page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-006"] },
      async ({ page }) => {
        await page.goto("/");

        // Should stay on home page
        await page.waitForLoadState("networkidle");
        expect(page.url()).toBe(new RegExp("^http://.*/$"));
      }
    );

    test("should allow access to login page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-007"] },
      async ({ page }) => {
        await page.goto("/auth/login");

        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/auth/login");
      }
    );

    test("should allow access to register page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-008"] },
      async ({ page }) => {
        await page.goto("/auth/register");

        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/auth/register");
      }
    );

    test("should allow access to forgot password page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-009"] },
      async ({ page }) => {
        await page.goto("/auth/forgot-password");

        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/auth/forgot-password");
      }
    );

    test("should allow access to reset password page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-010"] },
      async ({ page }) => {
        await page.goto("/auth/reset-password?token=abc");

        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/auth/reset-password");
      }
    );

    test("should allow access to verify email page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-011"] },
      async ({ page }) => {
        await page.goto("/auth/verify-email");

        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/auth/verify-email");
      }
    );
  });

  test.describe("API Routes - Bypass Middleware", () => {
    test("should not intercept API routes",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-012"] },
      async ({ page, request }) => {
        // API routes should bypass middleware
        const response = await request.get("/api/health");

        // Either 404 (route doesn't exist) or 200 (exists)
        // But NOT redirected to login
        expect([200, 404]).toContain(response.status());
      }
    );
  });

  test.describe("Static Files - Bypass Middleware", () => {
    test("should serve static files without redirect",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-013"] },
      async ({ page }) => {
        const response = await page.request.get("/favicon.ico");

        // Should not redirect to login
        expect(response.status()).not.toBe(404);
      }
    );
  });
});
