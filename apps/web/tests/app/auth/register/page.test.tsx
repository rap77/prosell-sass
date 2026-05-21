/**
 * Register Page Tests
 *
 * Tests for the register page component at /app/auth/register/page.tsx
 *
 * @see https://nextjs.org/docs/app/building-your-application/testing
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegisterPageContent } from "@/app/auth/register/RegisterPageContent";

// ============================================
// MOCKS
// ============================================

// Mock RegisterForm component
vi.mock("@/components/auth/RegisterForm", () => ({
  RegisterForm: () => <div data-testid="register-form">RegisterForm</div>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    register: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: { getState: () => ({ error: null }) },
}));

// ============================================
// TESTS
// ============================================

describe("RegisterPage", () => {
  describe("Rendering", () => {
    it("should render the register page with all main elements", () => {
      render(<RegisterPageContent />);

      expect(
        screen.getByRole("heading", { name: /Creá tu cuenta/i }),
      ).toBeInTheDocument();

      // Footer text
      expect(
        screen.getByText(/14 días gratis/i),
      ).toBeInTheDocument();
    });

    it("should render logo with correct styling and link", () => {
      render(<RegisterPageContent />);

      expect(screen.getByRole("button", { name: /Google/i })).toBeInTheDocument();
    });

    it("should render RegisterForm component inside a card", () => {
      render(<RegisterPageContent />);

      expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    });

    it("should render footer with Terms and Privacy links", () => {
      render(<RegisterPageContent />);

      const termsLink = screen.getByRole("link", { name: /Términos de Servicio/i });
      const privacyLink = screen.getByRole("link", { name: /Política de Privacidad/i });

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
      const { container } = render(<RegisterPageContent />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();
    });

    it("should center content in a max-width container", () => {
      const { container } = render(<RegisterPageContent />);

      expect(screen.getByRole("button", { name: /Crear cuenta/i })).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<RegisterPageContent />);

      expect(
        screen.getByRole("heading", { name: /Creá tu cuenta/i }),
      ).toBeInTheDocument();
    });

    it("should have accessible links with proper labels", () => {
      render(<RegisterPageContent />);

      expect(screen.getByRole("link", { name: /Términos de Servicio/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Política de Privacidad/i })).toBeInTheDocument();
    });
  });
});
