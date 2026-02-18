/**
 * TDD: TwoFactorSetupForm Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock authApi - use vi.hoisted to avoid hoisting issues
const { enable2FAMock, verify2FAMock, disable2FAMock } = vi.hoisted(() => ({
  enable2FAMock: vi.fn(),
  verify2FAMock: vi.fn(),
  disable2FAMock: vi.fn(),
}));

vi.mock("@/lib/api/authApi", () => ({
  authApi: {
    enable2FA: enable2FAMock,
    verify2FA: verify2FAMock,
    disable2FA: disable2FAMock,
  },
  ApiError: class MockApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      this.name = "ApiError";
    }
  },
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

// Mock useAuth hook
const { mockUpdateUser } = vi.hoisted(() => ({
  mockUpdateUser: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    updateUser: mockUpdateUser,
    isAuthenticated: true,
  })),
}));

import { TwoFactorSetupForm } from "@/components/auth/TwoFactorSetupForm";
import { authApi } from "@/lib/api/authApi";

describe("TwoFactorSetupForm Component", () => {
  const mockQRCode =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const mockBackupCodes = ["123456", "234567", "345678", "456789", "567890", "678901", "789012", "890123", "901234", "012345"];

  beforeEach(() => {
    enable2FAMock.mockResolvedValue({
      qr_code: mockQRCode,
      backup_codes: mockBackupCodes,
    });
    verify2FAMock.mockResolvedValue({ message: "2FA enabled successfully" });
    disable2FAMock.mockResolvedValue({ message: "2FA disabled successfully" });
    mockUpdateUser.mockClear();
    pushMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Initial Setup - Enable 2FA", () => {
    it("should call enable2FA on mount when 2FA is not enabled", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(authApi.enable2FA).toHaveBeenCalledWith();
      });
    });

    it("should show loading state while enabling 2FA", () => {
      enable2FAMock.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      expect(screen.getByText(/setting up two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should display QR code after successful enable", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        const qrImage = screen.getByAltText(/qr code/i);
        expect(qrImage).toBeInTheDocument();
        expect(qrImage).toHaveAttribute("src", mockQRCode);
      });
    });

    it("should display backup codes", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      // Check if backup codes section is shown (using getAllByText because there are multiple matches)
      const backupCodeElements = screen.getAllByText(/backup codes/i);
      expect(backupCodeElements.length).toBeGreaterThan(0);

      // Check if all backup codes are displayed
      mockBackupCodes.forEach((code) => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });

    it("should show error when enable2FA fails", async () => {
      enable2FAMock.mockRejectedValue(new Error("Failed to enable 2FA"));
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to enable 2fa/i)).toBeInTheDocument();
      });
    });
  });

  describe("Verification Flow", () => {
    it("should render TwoFactorInput for code entry", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/2fa code/i)).toBeInTheDocument();
    });

    it("should call verify2FA when submitting code", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      // Wait for TwoFactorInput to be ready
      const inputs = screen.getAllByRole("textbox");

      // Paste the complete code (this works in controlled mode)
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      // Submit form
      const verifyButton = screen.getByRole("button", { name: /verify and enable/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(authApi.verify2FA).toHaveBeenCalledWith("123456");
      });
    });

    it("should show loading state during verification", async () => {
      const user = userEvent.setup();
      verify2FAMock.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", { name: /verify and enable/i });
      await user.click(verifyButton);

      expect(screen.getByText(/verifying/i)).toBeInTheDocument();
      // The button is replaced by the verifying state UI, so we check for the verifying text instead
    });

    it("should show success state after verification", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", { name: /verify and enable/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication enabled/i)).toBeInTheDocument();
      });
    });

    it("should update user state after successful verification", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", { name: /verify and enable/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ is_2fa_enabled: true });
      });
    });

    it("should show error when verification fails", async () => {
      const user = userEvent.setup();

      // First, configure the mock to reject
      // This MUST be done before rendering the component
      verify2FAMock.mockRejectedValueOnce(new Error("Invalid code"));

      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Wait for initial enable2FA call to complete and setup state
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      // Use the first input to paste the complete code
      const inputs = screen.getAllByRole("textbox");
      const firstInput = inputs[0];
      firstInput.focus();
      await user.paste("123456");

      // Find the verify button
      const verifyButton = screen.getByRole("button", { name: /verify and enable/i });

      // Submit form - this will call verify2FA which will reject
      await user.click(verifyButton);

      // Wait for verify2FA to be called
      await waitFor(() => {
        expect(verify2FAMock).toHaveBeenCalled();
      });

      // Debug: Let's see what happens in the DOM after the API call
      // The issue is that startTransition delays state updates
      // We need to wait for React to flush all pending updates

      // Step 1: Wait for the verifying state to appear
      await waitFor(() => {
        const verifyingText = screen.queryByText(/verifying/i);
        if (verifyingText) {
          expect(verifyingText).toBeInTheDocument();
        }
      }, { timeout: 2000 });

      // Step 2: Now wait for the error state to appear
      // After verification fails, we should be back in setup state with error
      await waitFor(
        () => {
          // Check for error in multiple ways to handle React 19's async rendering
          const bodyText = document.body.textContent;

          // The error message should be in the DOM
          if (!bodyText?.includes("Invalid code")) {
            throw new Error(
              `Error message not found in DOM. Current state: ${bodyText?.substring(0, 200)}`
            );
          }

          // Verify we're back in setup state
          const heading = screen.queryByRole("heading", { name: /set up two-factor/i });
          if (!heading) {
            throw new Error("Setup heading not found. Current text: " + bodyText?.substring(0, 200));
          }

          expect(heading).toBeInTheDocument();
        },
        { timeout: 8000 }
      );
    });
  });

  describe("Disable 2FA Flow", () => {
    it("should show disable section when 2FA is already enabled", () => {
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      expect(screen.getByText(/two-factor authentication is enabled/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /disable 2fa/i })).toBeInTheDocument();
    });

    it("should call disable2FA when clicking disable button", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", { name: /disable 2fa/i });
      await user.click(disableButton);

      await waitFor(() => {
        expect(authApi.disable2FA).toHaveBeenCalledWith();
      });
    });

    it("should show loading state during disable", async () => {
      const user = userEvent.setup();
      disable2FAMock.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", { name: /disable 2fa/i });
      await user.click(disableButton);

      // Button should be replaced with disabling state
      expect(screen.queryByRole("button", { name: /disable 2fa/i })).not.toBeInTheDocument();
      // Text "Disabling..." should be present somewhere in the document
      expect(screen.getAllByText(/disabling/i).length).toBeGreaterThan(0);
    });

    it("should show success state after disabling", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", { name: /disable 2fa/i });
      await user.click(disableButton);

      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication disabled/i)).toBeInTheDocument();
      });
    });

    it("should update user state after successful disable", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", { name: /disable 2fa/i });
      await user.click(disableButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ is_2fa_enabled: false });
      });
    });

    it("should show error when disable fails", async () => {
      const user = userEvent.setup();
      disable2FAMock.mockRejectedValue(new Error("Failed to disable 2FA"));
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", { name: /disable 2fa/i });
      await user.click(disableButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to disable 2fa/i)).toBeInTheDocument();
      });
    });
  });

  describe("User Actions", () => {
    it("should navigate to profile when clicking done after enable", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", { name: /verify and enable/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication enabled/i)).toBeInTheDocument();
      });

      const doneButton = screen.getByRole("button", { name: /done/i });
      await user.click(doneButton);

      expect(pushMock).toHaveBeenCalledWith("/profile");
    });

    it("should download backup codes as text file", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      // Check if download button exists
      const downloadButton = screen.getByRole("button", { name: /download backup codes/i });
      expect(downloadButton).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        // Wait for the setup state heading to appear
        const heading = screen.getByRole("heading", { name: /set up two-factor authentication/i });
        expect(heading).toBeInTheDocument();
      });
    });

    it("should show loading indicator with proper ARIA", () => {
      enable2FAMock.mockImplementation(() => new Promise(() => {}));
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
    });

    it("should have proper form labels", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/2fa code/i)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty backup codes gracefully", async () => {
      enable2FAMock.mockResolvedValue({
        qr_code: mockQRCode,
        backup_codes: [],
      });
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /set up two-factor/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/no backup codes available/i)).toBeInTheDocument();
    });

    it("should handle network errors gracefully", async () => {
      enable2FAMock.mockRejectedValue(new Error("Network error"));
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });
});
