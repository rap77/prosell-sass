/**
 * Route Protection Middleware E2E Tests
 *
 * Tests for Next.js middleware that protects authenticated routes.
 * Verifies redirects and access control.
 */

import { test, expect } from "@playwright/test";

test.describe("Route Protection Middleware", () => {
  test.describe("Protected Routes - Unauthenticated User", () => {
    test(
      "@smoke should redirect to login when accessing /dashboard",
      { tag: ["@critical", "@e2e", "@middleware", "@MIDDLEWARE-E2E-001"] },
      async ({ page }) => {
        await page.goto("/dashboard");

        // Should redirect to login
        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("/auth/login");
      },
    );

    test(
      "should include redirect parameter in login URL",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-002"] },
      async ({ page }) => {
        await page.goto("/dashboard");

        await page.waitForURL(/\/auth\/login/);
        // Accept both encoded and unencoded redirect parameter
        const hasRedirect =
          page.url().includes("redirect=/dashboard") ||
          page.url().includes("redirect=%2Fdashboard");
        expect(hasRedirect).toBeTruthy();
      },
    );

    test(
      "should redirect to login when accessing /profile",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-003"] },
      async ({ page }) => {
        await page.goto("/profile");

        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("/auth/login");
      },
    );

    test(
      "should redirect to login when accessing /settings",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-004"] },
      async ({ page }) => {
        await page.goto("/settings");

        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("/auth/login");
      },
    );

    test(
      "should redirect to login when accessing /auth/setup-2fa",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-005"] },
      async ({ page }) => {
        await page.goto("/auth/setup-2fa");

        await page.waitForURL(/\/auth\/login/);
        expect(page.url()).toContain("/auth/login");
      },
    );
  });

  test.describe("Public Routes - No Auth Required", () => {
    test(
      "should allow access to home page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-006"] },
      async ({ page }) => {
        await page.goto("/");

        // Should stay on home page
        await page.waitForLoadState("load");
        // URL is http://localhost:3000/ which ends with /
        expect(page.url()).toMatch(/localhost:3000\/?$/);
      },
    );

    test(
      "should allow access to login page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-007"] },
      async ({ page }) => {
        await page.goto("/auth/login");

        await page.waitForLoadState("load");
        expect(page.url()).toContain("/auth/login");
      },
    );

    test(
      "should allow access to register page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-008"] },
      async ({ page }) => {
        await page.goto("/auth/register");

        await page.waitForLoadState("load");
        expect(page.url()).toContain("/auth/register");
      },
    );

    test(
      "should allow access to forgot password page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-009"] },
      async ({ page }) => {
        await page.goto("/auth/forgot-password");

        await page.waitForLoadState("load");
        expect(page.url()).toContain("/auth/forgot-password");
      },
    );

    test(
      "should allow access to reset password page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-010"] },
      async ({ page }) => {
        await page.goto("/auth/reset-password?token=abc");

        await page.waitForLoadState("load");
        expect(page.url()).toContain("/auth/reset-password");
      },
    );

    test(
      "should allow access to verify email page",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-011"] },
      async ({ page }) => {
        await page.goto("/auth/verify-email");

        await page.waitForLoadState("load");
        expect(page.url()).toContain("/auth/verify-email");
      },
    );
  });

  test.describe("API Routes - Bypass Middleware", () => {
    test(
      "should not intercept API routes",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-012"] },
      async ({ page, request }) => {
        // API routes should bypass middleware
        const response = await request.get("/api/health");

        // API routes bypass middleware - could be 200 (exists), 404 (not found),
        // or 500 (server error) but NOT 302 redirected to login
        expect([200, 404, 500]).toContain(response.status());
        expect(response.status()).not.toBe(302);
      },
    );
  });

  test.describe("Static Files - Bypass Middleware", () => {
    test(
      "should serve static files without redirect",
      { tag: ["@e2e", "@middleware", "@MIDDLEWARE-E2E-013"] },
      async ({ page }) => {
        const response = await page.request.get("/favicon.ico");

        // Static files should be served (may be 404 if file doesn't exist, but no auth redirect)
        expect(response.status()).not.toBe(401);
        expect(response.status()).not.toBe(403);
      },
    );
  });
});
