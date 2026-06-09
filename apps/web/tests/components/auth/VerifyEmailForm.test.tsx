/**
 * TDD: VerifyEmailForm Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock authApi - use vi.hoisted to avoid hoisting issues
const { verifyEmailMock, MockApiError } = vi.hoisted(() => {
  return {
    verifyEmailMock: vi.fn(),
    MockApiError: class MockApiError extends Error {
      status: number;
      constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "ApiError";
      }
    },
  };
});

vi.mock("@/lib/api/authApi", () => ({
  authApi: {
    verifyEmail: verifyEmailMock,
  },
  ApiError: MockApiError,
}));

// Mock Next.js router
const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { authApi } from "@/lib/api/authApi";

describe("VerifyEmailForm Component", () => {
  const mockToken = "test-verification-token-123";

  beforeEach(() => {
    verifyEmailMock.mockResolvedValue(undefined);
    pushMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render loading state initially", () => {
      render(<VerifyEmailForm token={mockToken} />);

      expect(screen.getByText(/Verificando tu email/i)).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should render error when no token provided", async () => {
      render(<VerifyEmailForm token="" />);

      // Wait for useEffect to run
      await waitFor(() => {
        expect(screen.getByText(/Verificación fallida/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(/enlace de verificación no es válido/i),
      ).toBeInTheDocument();
    });
  });

  describe("Verification Flow", () => {
    it("should call verifyEmail with token on mount", async () => {
      render(<VerifyEmailForm token={mockToken} />);

      await waitFor(() => {
        expect(authApi.verifyEmail).toHaveBeenCalledWith(mockToken);
      });
    });

    it("should show success state when verification succeeds", async () => {
      verifyEmailMock.mockResolvedValue(undefined);
      render(<VerifyEmailForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Email verificado/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Email verificado/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Iniciar sesión/i }),
      ).toBeInTheDocument();
    });

    it("should show error state when verification fails", async () => {
      verifyEmailMock.mockRejectedValue({
        message: "Invalid or expired token",
        status: 400,
      });
      render(<VerifyEmailForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/verificación fallida/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
    });
  });

  describe("Error States", () => {
    it("should show 404 error for not found", async () => {
      // Use ApiError instance to properly test the error handling
      verifyEmailMock.mockRejectedValue(new MockApiError("Not found", 404));
      render(<VerifyEmailForm token={mockToken} />);

      await waitFor(() => {
        // Check that the heading shows "Enlace no encontrado"
        expect(screen.getByText("Enlace no encontrado")).toBeInTheDocument();
      });
    });

    it("should show generic error for network issues", async () => {
      verifyEmailMock.mockRejectedValue(new Error("Network error"));
      render(<VerifyEmailForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("User Actions", () => {
    it("should navigate to login when clicking continue button", async () => {
      verifyEmailMock.mockResolvedValue(undefined);
      render(<VerifyEmailForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Email verificado/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole("link", {
        name: /Iniciar sesión/i,
      });
      expect(continueButton).toHaveAttribute("href", "/auth/login");
    });

    it("should have resend email option in error state", async () => {
      verifyEmailMock.mockRejectedValue({ message: "Expired", status: 400 });
      render(<VerifyEmailForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/verificación fallida/i)).toBeInTheDocument();
      });

      // Verify there's a way to request new verification
      expect(
        screen.getByRole("link", { name: /Solicitar nueva verificación/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<VerifyEmailForm token={mockToken} />);

      // chadcn/ui CardTitle - search by text instead of level
      const heading = screen.getByRole("heading", {
        name: /Verificación de email/i,
      });
      expect(heading).toBeInTheDocument();
    });

    it("should show loading indicator with proper ARIA", () => {
      render(<VerifyEmailForm token={mockToken} />);

      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty token gracefully", async () => {
      render(<VerifyEmailForm token="" />);

      await waitFor(() => {
        expect(
          screen.getByText(/enlace de verificación no es válido/i),
        ).toBeInTheDocument();
      });
    });

    it("should handle undefined token", async () => {
      render(<VerifyEmailForm token={undefined} />);

      await waitFor(() => {
        expect(
          screen.getByText(/enlace de verificación no es válido/i),
        ).toBeInTheDocument();
      });
    });
  });
});
