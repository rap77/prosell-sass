/**
 * Verify Email Page Tests
 *
 * Tests for the verify email page component at /app/auth/verify-email/page.tsx
 *
 * Note: This is an async Server Component which cannot be easily tested with Vitest.
 * The actual functionality is tested via E2E tests with Playwright.
 * These tests verify the module exports correctly.
 */

import { describe, it, expect, vi } from "vitest";

// Import the page component to ensure it loads correctly
import VerifyEmailPage from "@/app/auth/verify-email/page";
import { metadata } from "@/app/auth/verify-email/page";

// ============================================
// TESTS
// ============================================

describe("VerifyEmailPage", () => {
  describe("Module exports", () => {
    it("should export the page component as default", () => {
      expect(VerifyEmailPage).toBeDefined();
      expect(typeof VerifyEmailPage).toBe("function");
    });

    it("should export metadata", () => {
      expect(metadata).toBeDefined();
      expect(metadata.title).toBe("Verify Email - ProSell");
      expect(metadata.description).toContain("Verify your email");
    });
  });

  describe("Component Type", () => {
    it("should be an async function", () => {
      // Async Server Components in Next.js are async functions
      expect(VerifyEmailPage.constructor.name).toBe("AsyncFunction"); // @ts-ignore
    });
  });
});
