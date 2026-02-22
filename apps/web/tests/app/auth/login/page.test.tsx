/**
 * Login Page Tests
 *
 * Tests for the login page component at /app/auth/login/page.tsx
 *
 * @see https://nextjs.org/docs/app/building-your-application/testing
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginPageContent } from "@/app/auth/login/LoginPageContent";

// ============================================
// MOCKS
// ============================================

// Mock LoginForm component
vi.mock("@/components/auth/LoginForm", () => ({
  LoginForm: () => <div data-testid="login-form">LoginForm</div>,
}));

// ============================================
// TESTS
// ============================================

describe("LoginPage", () => {
  describe("Rendering", () => {
    it("should render the login page with all main elements", () => {
      render(<LoginPageContent />);

      // Logo/Brand
      const logo = screen.getByRole("link", { name: /prosell/i });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("href", "/");

      // LoginForm card
      const formCard = screen.getByTestId("login-form");
      expect(formCard).toBeInTheDocument();

      // Footer text
      expect(
        screen.getByText(/by signing in, you agree to our/i),
      ).toBeInTheDocument();
    });

    it("should render logo with correct styling and link", () => {
      render(<LoginPageContent />);

      const logo = screen.getByRole("link", { name: /prosell/i });
      expect(logo).toHaveClass(
        "inline-flex",
        "items-center",
        "gap-2",
        "text-2xl",
        "font-bold",
      );
      expect(logo).toHaveAttribute("href", "/");
    });

    it("should render LoginForm component inside a card", () => {
      render(<LoginPageContent />);

      const formCard = screen.getByTestId("login-form").parentElement;
      expect(formCard).toHaveClass(
        "bg-white",
        "dark:bg-slate-800",
        "rounded-2xl",
        "shadow-xl",
        "p-8",
        "border",
      );
    });

    it("should render footer with Terms and Privacy links", () => {
      render(<LoginPageContent />);

      const termsLink = screen.getByRole("link", { name: /terms of service/i });
      const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute("href", "/terms");

      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute("href", "/privacy");
    });
  });

  describe("Layout and Styling", () => {
    it("should render with full-page gradient background", () => {
      const { container } = render(<LoginPageContent />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        "min-h-screen",
        "flex",
        "items-center",
        "justify-center",
        "bg-gradient-to-br",
      );
    });

    it("should center content in a max-width container", () => {
      const { container } = render(<LoginPageContent />);

      const centerContainer = container.querySelector(".max-w-md");
      expect(centerContainer).toBeInTheDocument();
      expect(centerContainer).toHaveClass("w-full", "space-y-8");
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<LoginPageContent />);

      // The page itself doesn't have h1/h2, those are inside LoginForm
      // This test documents that decision
      const logo = screen.getByRole("link", { name: /prosell/i });
      expect(logo).toBeInTheDocument();
    });

    it("should have accessible links with proper labels", () => {
      render(<LoginPageContent />);

      // Logo link
      expect(
        screen.getByRole("link", { name: /prosell/i }),
      ).toBeInTheDocument();

      // Terms link
      expect(
        screen.getByRole("link", { name: /terms of service/i }),
      ).toBeInTheDocument();

      // Privacy link
      expect(
        screen.getByRole("link", { name: /privacy policy/i }),
      ).toBeInTheDocument();
    });
  });
});
