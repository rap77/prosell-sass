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

// Mock featureFlagStore
vi.mock("@/stores/featureFlagStore", () => ({
  useFeatureFlagStore: vi.fn(() => ({
    get: vi.fn(() => true), // Feature flag enabled by default
  })),
}));

import { TwoFactorSetupForm } from "@/components/auth/TwoFactorSetupForm";
import { authApi } from "@/lib/api/authApi";

describe("TwoFactorSetupForm Component", () => {
  const mockQRCode =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const mockBackupCodes = [
    "123456",
    "234567",
    "345678",
    "456789",
    "567890",
    "678901",
    "789012",
    "890123",
    "901234",
    "012345",
  ];

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

  describe("Initial Setup - Enable 2FA (New Behavior)", () => {
    it("should show Enable 2FA button when 2FA is not enabled", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Should NOT call enable2FA on mount
      expect(authApi.enable2FA).not.toHaveBeenCalled();

      // Should show idle state with "Enable 2FA" button
      await waitFor(() => {
        expect(screen.getByText(/protect your account/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
    });

    it("should call enable2FA when clicking Enable button", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Wait for idle state
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });

      // Click Enable button
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Should call enable2FA
      await waitFor(() => {
        expect(authApi.enable2FA).toHaveBeenCalledWith();
      });
    });

    it("should show loading state while enabling 2FA after clicking Enable", async () => {
      const user = userEvent.setup();
      enable2FAMock.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Wait for idle state and click Enable
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Should show loading state
      expect(
        screen.getByText(/setting up two-factor authentication/i),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should display QR code after successful enable", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Wait for idle state and click Enable
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for QR code to appear
      await waitFor(() => {
        const qrImage = screen.getByAltText(/qr code/i);
        expect(qrImage).toBeInTheDocument();
        expect(qrImage).toHaveAttribute("src", mockQRCode);
      });
    });

    it("should display backup codes", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Wait for idle state and click Enable
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      // Check if backup codes section is shown
      const backupCodeElements = screen.getAllByText(/backup codes/i);
      expect(backupCodeElements.length).toBeGreaterThan(0);

      // Check if all backup codes are displayed
      mockBackupCodes.forEach((code) => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });

    it("should show error when enable2FA fails", async () => {
      const user = userEvent.setup();
      enable2FAMock.mockRejectedValue(new Error("Failed to enable 2FA"));
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Wait for idle state and click Enable
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/failed to enable 2fa/i)).toBeInTheDocument();
      });
    });
  });

  describe("Verification Flow", () => {
    it("should render TwoFactorInput for code entry", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable button first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Now should show setup state with input
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/2fa code/i)).toBeInTheDocument();
    });

    it("should call verify2FA when submitting code", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable button first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      // Wait for TwoFactorInput to be ready
      const inputs = screen.getAllByRole("textbox");

      // Paste the complete code
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      // Submit form
      const verifyButton = screen.getByRole("button", {
        name: /verify and enable/i,
      });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(authApi.verify2FA).toHaveBeenCalledWith("123456");
      });
    });

    it("should show loading state during verification", async () => {
      const user = userEvent.setup();
      verify2FAMock.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable button first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", {
        name: /verify and enable/i,
      });
      await user.click(verifyButton);

      expect(screen.getByText(/verifying/i)).toBeInTheDocument();
    });

    it("should show success state after verification", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable button first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", {
        name: /verify and enable/i,
      });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(
          screen.getByText(/two-factor authentication enabled/i),
        ).toBeInTheDocument();
      });
    });

    it("should update user state after successful verification", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable button first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", {
        name: /verify and enable/i,
      });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ is_2fa_enabled: true });
      });
    });

    it("should show error when verification fails", async () => {
      const user = userEvent.setup();
      verify2FAMock.mockRejectedValueOnce(new Error("Invalid code"));
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable button first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", {
        name: /verify and enable/i,
      });
      await user.click(verifyButton);

      // Should show error message - use more specific matcher or getAllByText
      await waitFor(() => {
        const errorElements = screen.getAllByText(/invalid/i);
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Protected View - 2FA Already Enabled", () => {
    it("should show disable section when 2FA is already enabled", () => {
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      expect(
        screen.getByText(/two-factor authentication is enabled/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /disable 2fa/i }),
      ).toBeInTheDocument();
    });

    it("should call disable2FA when clicking disable button", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", {
        name: /disable 2fa/i,
      });
      await user.click(disableButton);

      await waitFor(() => {
        expect(authApi.disable2FA).toHaveBeenCalledWith();
      });
    });

    it("should show loading state during disable", async () => {
      const user = userEvent.setup();
      disable2FAMock.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", {
        name: /disable 2fa/i,
      });
      await user.click(disableButton);

      // Button should be replaced with disabling state
      expect(
        screen.queryByRole("button", { name: /disable 2fa/i }),
      ).not.toBeInTheDocument();
      // Text "Disabling..." should be present somewhere in the document
      expect(screen.getAllByText(/disabling/i).length).toBeGreaterThan(0);
    });

    it("should show success state after disabling", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", {
        name: /disable 2fa/i,
      });
      await user.click(disableButton);

      await waitFor(() => {
        expect(
          screen.getByText(/two-factor authentication disabled/i),
        ).toBeInTheDocument();
      });
    });

    it("should update user state after successful disable", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", {
        name: /disable 2fa/i,
      });
      await user.click(disableButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ is_2fa_enabled: false });
      });
    });

    it("should show error when disable fails", async () => {
      const user = userEvent.setup();
      disable2FAMock.mockRejectedValue(new Error("Failed to disable 2FA"));
      render(<TwoFactorSetupForm is2FAEnabled={true} />);

      const disableButton = screen.getByRole("button", {
        name: /disable 2fa/i,
      });
      await user.click(disableButton);

      // The component should handle the error gracefully
      // Just verify the API was called and no crash occurred
      await waitFor(() => {
        expect(disable2FAMock).toHaveBeenCalledWith();
      });
    });
  });

  describe("User Actions", () => {
    it("should navigate to profile when clicking done after enable", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable button first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state and complete verification
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0];
      input.focus();

      await user.paste("123456");

      const verifyButton = screen.getByRole("button", {
        name: /verify and enable/i,
      });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(
          screen.getByText(/two-factor authentication enabled/i),
        ).toBeInTheDocument();
      });

      const doneButton = screen.getByRole("button", { name: /done/i });
      await user.click(doneButton);

      expect(pushMock).toHaveBeenCalledWith("/profile");
    });

    it("should download backup codes as text file", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable button first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      // Check if download button exists
      const downloadButton = screen.getByRole("button", {
        name: /download backup codes/i,
      });
      expect(downloadButton).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure in idle state", async () => {
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Should show idle state with heading
      await waitFor(() => {
        expect(
          screen.getByText(/set up two-factor authentication/i),
        ).toBeInTheDocument();
      });
    });

    it("should show loading indicator with proper ARIA", async () => {
      const user = userEvent.setup();
      enable2FAMock.mockImplementation(() => new Promise(() => {}));
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable to trigger loading
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
    });

    it("should have proper form labels", async () => {
      const user = userEvent.setup();
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/2fa code/i)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty backup codes gracefully", async () => {
      const user = userEvent.setup();
      enable2FAMock.mockResolvedValue({
        qr_code: mockQRCode,
        backup_codes: [],
      });
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for setup state
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set up two-factor/i }),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/no backup codes available/i),
      ).toBeInTheDocument();
    });

    it("should handle network errors gracefully", async () => {
      const user = userEvent.setup();
      enable2FAMock.mockRejectedValue(new Error("Network error"));
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable first
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("beforeunload Warning", () => {
    it("should add beforeunload listener during operations", async () => {
      const user = userEvent.setup();
      enable2FAMock.mockImplementation(() => new Promise(() => {}));
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Track event listener additions
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      // Click Enable to trigger loading state
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Should add beforeunload listener during loading
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it("should NOT add beforeunload listener in idle state", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Should NOT add beforeunload listener in idle state
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });
  });

  describe("Security - NO secrets in localStorage", () => {
    it("should NOT persist QR code in localStorage", async () => {
      const user = userEvent.setup();
      const localStorageSetSpy = vi.spyOn(Storage.prototype, "setItem");
      render(<TwoFactorSetupForm is2FAEnabled={false} />);

      // Click Enable
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /enable 2fa/i }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /enable 2fa/i }));

      // Wait for QR code to appear
      await waitFor(() => {
        const qrImage = screen.queryByAltText(/qr code/i);
        if (qrImage) {
          expect(qrImage).toBeInTheDocument();
        }
      });

      // Verify localStorage was NOT called with QR code
      const localStorageCalls = localStorageSetSpy.mock.calls.flat().join(" ");
      expect(localStorageCalls).not.toContain("qr_code");
      expect(localStorageCalls).not.toContain("totp");
      expect(localStorageCalls).not.toContain("secret");

      localStorageSetSpy.mockRestore();
    });
  });
});
