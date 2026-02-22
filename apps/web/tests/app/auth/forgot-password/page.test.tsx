/**
 * Forgot Password Page Tests
 *
 * Tests for the forgot password page component at /app/auth/forgot-password/page.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ForgotPasswordPage from "@/app/auth/forgot-password/page";

// ============================================
// MOCKS
// ============================================

// Mock ForgotPasswordForm component
vi.mock("@/components/auth/ForgotPasswordForm", () => ({
  ForgotPasswordForm: () => (
    <div data-testid="forgot-password-form">ForgotPasswordForm</div>
  ),
}));

// ============================================
// TESTS
// ============================================

describe("ForgotPasswordPage", () => {
  describe("Rendering", () => {
    it("should render the ForgotPasswordForm component", () => {
      render(<ForgotPasswordPage />);

      const form = screen.getByTestId("forgot-password-form");
      expect(form).toBeInTheDocument();
    });

    it("should render as a simple wrapper around ForgotPasswordForm", () => {
      const { container } = render(<ForgotPasswordPage />);

      // The page is a simple wrapper, just check that it renders
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have direct child as ForgotPasswordForm", () => {
      const { container } = render(<ForgotPasswordPage />);

      const form = screen.getByTestId("forgot-password-form");
      expect(container.firstChild).toContainElement(form);
    });
  });
});
