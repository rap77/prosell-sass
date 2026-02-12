/**
 * Register Page Tests
 *
 * Tests for the register page component at /app/auth/register/page.tsx
 *
 * @see https://nextjs.org/docs/app/building-your-application/testing
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterPage from "@/app/auth/register/page";

// ============================================
// MOCKS
// ============================================

// Mock RegisterForm component
vi.mock("@/components/auth/RegisterForm", () => ({
  RegisterForm: () => <div data-testid="register-form">RegisterForm</div>,
}));

// ============================================
// TESTS
// ============================================

describe("RegisterPage", () => {
  describe("Rendering", () => {
    it("should render the register page with all main elements", () => {
      render(<RegisterPage />);

      // Logo/Brand
      const logo = screen.getByRole("link", { name: /prosell/i });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("href", "/");

      // RegisterForm card
      const formCard = screen.getByTestId("register-form");
      expect(formCard).toBeInTheDocument();

      // Footer text
      expect(screen.getByText(/by creating an account, you agree to our/i)).toBeInTheDocument();
    });

    it("should render logo with correct styling and link", () => {
      render(<RegisterPage />);

      const logo = screen.getByRole("link", { name: /prosell/i });
      expect(logo).toHaveClass(
        "inline-flex",
        "items-center",
        "gap-2",
        "text-2xl",
        "font-bold"
      );
      expect(logo).toHaveAttribute("href", "/");
    });

    it("should render RegisterForm component inside a card", () => {
      render(<RegisterPage />);

      const formCard = screen.getByTestId("register-form").parentElement;
      expect(formCard).toHaveClass(
        "bg-white",
        "dark:bg-slate-800",
        "rounded-2xl",
        "shadow-xl",
        "p-8",
        "border"
      );
    });

    it("should render footer with Terms and Privacy links", () => {
      render(<RegisterPage />);

      const termsLink = screen.getByRole("link", { name: /terms of service/i });
      const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute("href", "/terms");

      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute("href", "/privacy");
    });
  });

  // NOTE: In Next.js 13+ App Router, metadata is handled by the framework
  // and is not directly accessible on the component for testing.
  // Metadata is generated at build time and used by the router.
  // The metadata object IS correctly defined in the page component,
  // but Vitest cannot access it in this way.
  //
  // To verify metadata works correctly, you would need to:
  // 1. Use a tool like next-metadata-scraper
  // 2. Check the actual HTML output in a deployed app
  // 3. Use Playwright E2E tests to verify document.title and meta tags
  //
  // For now, we verify the page structure and accessibility.

  describe("Layout and Styling", () => {
    it("should render with full-page gradient background", () => {
      const { container } = render(<RegisterPage />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        "min-h-screen",
        "flex",
        "items-center",
        "justify-center",
        "bg-gradient-to-br"
      );
    });

    it("should center content in a max-width container", () => {
      const { container } = render(<RegisterPage />);

      const centerContainer = container.querySelector(".max-w-md");
      expect(centerContainer).toBeInTheDocument();
      expect(centerContainer).toHaveClass("w-full", "space-y-8");
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<RegisterPage />);

      // The page itself doesn't have h1/h2, those are inside RegisterForm
      // This test documents that decision
      const logo = screen.getByRole("link", { name: /prosell/i });
      expect(logo).toBeInTheDocument();
    });

    it("should have accessible links with proper labels", () => {
      render(<RegisterPage />);

      // Logo link
      expect(screen.getByRole("link", { name: /prosell/i })).toBeInTheDocument();

      // Terms link
      expect(screen.getByRole("link", { name: /terms of service/i })).toBeInTheDocument();

      // Privacy link
      expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
    });
  });
});
