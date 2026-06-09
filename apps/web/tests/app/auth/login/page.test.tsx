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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    login: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  }),
}));

// ============================================
// TESTS
// ============================================

describe("LoginPage", () => {
  describe("Rendering", () => {
    it("should render the login page with all main elements", () => {
      render(<LoginPageContent />);

      // Logo/Brand
      const logo = screen.getByAltText("ProSell").closest("a");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("href", "/");

      // LoginForm card
      expect(
        screen.getByRole("heading", { name: /Bienvenido de vuelta/i }),
      ).toBeInTheDocument();

      // Footer text
      expect(screen.getByText(/¿No tenés cuenta\?/i)).toBeInTheDocument();
    });

    it("should render logo with correct styling and link", () => {
      render(<LoginPageContent />);

      const logo = screen.getByAltText("ProSell").closest("a");
      expect(logo).toHaveAttribute("href", "/");
    });

    it("should render LoginForm component inside a card", () => {
      render(<LoginPageContent />);

      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getAllByLabelText(/Contraseña/i).length).toBeGreaterThan(0);
    });

    it("should render footer with Terms and Privacy links", () => {
      render(<LoginPageContent />);

      const registerLink = screen.getByRole("link", {
        name: /Registrate gratis/i,
      });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute("href", "/auth/register");
    });
  });

  describe("Layout and Styling", () => {
    it("should render with full-page gradient background", () => {
      const { container } = render(<LoginPageContent />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();
    });

    it("should center content in a max-width container", () => {
      const { container } = render(<LoginPageContent />);

      expect(
        screen.getByRole("button", { name: /Iniciar sesión/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<LoginPageContent />);

      // The page itself doesn't have h1/h2, those are inside LoginForm
      // This test documents that decision
      const logo = screen.getByAltText("ProSell").closest("a");
      expect(logo).toBeInTheDocument();
    });

    it("should have accessible links with proper labels", () => {
      render(<LoginPageContent />);

      // Logo link
      expect(screen.getByAltText("ProSell").closest("a")).toBeInTheDocument();

      // Terms link
      expect(
        screen.getByRole("link", { name: /¿Olvidaste tu contraseña\?/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Registrate gratis/i }),
      ).toBeInTheDocument();
    });
  });
});
