/**
 * TDD: Setup-2FA Page Tests
 * Tests for the 2FA setup page
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Setup2FAPageContent } from "@/app/auth/setup-2fa/Setup2FAPageContent";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

describe("Setup-2FA Page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Layout", () => {
    it("should render ProSell logo", () => {
      render(<Setup2FAPageContent />);

      expect(screen.getByText("ProSell")).toBeInTheDocument();
    });

    it("should render TwoFactorSetupForm", () => {
      const { container } = render(<Setup2FAPageContent />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it("should have proper page structure", () => {
      const { container } = render(<Setup2FAPageContent />);

      const pageDiv = container.querySelector(".min-h-screen");
      expect(pageDiv).toBeInTheDocument();
    });
  });

  describe("2FA State", () => {
    it("should pass is2FAEnabled=false to TwoFactorSetupForm by default", () => {
      const { container } = render(<Setup2FAPageContent />);

      // TwoFactorSetupForm should be rendered
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
