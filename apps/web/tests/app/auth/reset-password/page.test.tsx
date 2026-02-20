/**
 * Reset Password Page Tests
 *
 * Tests for the reset password page component at /app/auth/reset-password/page.tsx
 *
 * Note: This is an async Server Component which cannot be easily tested with Vitest.
 * The actual functionality is tested via E2E tests with Playwright.
 * These tests verify the module exports correctly.
 */

import { describe, it, expect, vi } from "vitest";

// Import the page component to ensure it loads correctly
import ResetPasswordPage from "@/app/auth/reset-password/page";
import { metadata } from "@/app/auth/reset-password/page";

// ============================================
// TESTS
// ============================================

describe("ResetPasswordPage", () => {
  describe("Module exports", () => {
    it("should export the page component as default", () => {
      expect(ResetPasswordPage).toBeDefined();
      expect(typeof ResetPasswordPage).toBe("function");
    });

    it("should export metadata", () => {
      expect(metadata).toBeDefined();
      expect(metadata.title).toBe("Reset Password - ProSell");
      expect(metadata.description).toContain("Reset your password");
    });
  });

  describe("Component Type", () => {
    it("should be an async function", () => {
      // Async Server Components in Next.js are async functions
      expect(ResetPasswordPage.constructor.name).toBe("AsyncFunction"); // @ts-ignore
    });
  });
});
