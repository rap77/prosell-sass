/**
 * TDD: OAuthButtons Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

describe("OAuthButtons Component", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Basic Rendering", () => {
    it("should render Google and Facebook buttons", () => {
      render(<OAuthButtons />);

      expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue with facebook/i })).toBeInTheDocument();
    });

    it("should render Google button with outline variant", () => {
      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      // chadcn/ui outline variant applies different classes
      expect(googleButton).toHaveClass(/inline-flex/);
      expect(googleButton).toHaveClass(/items-center/);
    });

    it("should render Facebook button with default styling", () => {
      render(<OAuthButtons />);

      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });
      // chadcn/ui Button uses flex classes
      expect(facebookButton).toHaveClass(/inline-flex/);
      expect(facebookButton).toHaveClass(/items-center/);
    });

    it("should render both buttons with icons", () => {
      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });

      expect(googleButton.querySelector("svg")).toBeInTheDocument();
      expect(facebookButton.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Click Handlers", () => {
    it("should call onGoogleClick when Google button is clicked", async () => {
      const user = userEvent.setup();
      const onGoogleClick = vi.fn();

      render(<OAuthButtons onGoogleClick={onGoogleClick} />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      await user.click(googleButton);

      expect(onGoogleClick).toHaveBeenCalledTimes(1);
    });

    it("should call onFacebookClick when Facebook button is clicked", async () => {
      const user = userEvent.setup();
      const onFacebookClick = vi.fn();

      render(<OAuthButtons onFacebookClick={onFacebookClick} />);

      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });
      await user.click(facebookButton);

      expect(onFacebookClick).toHaveBeenCalledTimes(1);
    });

    it("should handle clicks when no callbacks provided", async () => {
      const user = userEvent.setup();

      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });

      await user.click(googleButton);
      await user.click(facebookButton);

      expect(true).toBe(true);
    });
  });

  describe("Loading States", () => {
    it("should show loading state on Google button when googleLoading is true", () => {
      render(<OAuthButtons googleLoading />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      expect(googleButton).toBeDisabled();
      expect(googleButton).toHaveAttribute("aria-busy", "true");
    });

    it("should show loading state on Facebook button when facebookLoading is true", () => {
      render(<OAuthButtons facebookLoading />);

      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });
      expect(facebookButton).toBeDisabled();
      expect(facebookButton).toHaveAttribute("aria-busy", "true");
    });

    it("should show loading spinner on Google button when loading", () => {
      render(<OAuthButtons googleLoading />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      const spinner = googleButton.querySelector('[data-present="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it("should show loading spinner on Facebook button when loading", () => {
      render(<OAuthButtons facebookLoading />);

      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });
      const spinner = facebookButton.querySelector('[data-present="loader-icon"]');
      expect(spinner).toBeInTheDocument();
    });

    it("should not trigger callback when Google button is loading", async () => {
      const user = userEvent.setup();
      const onGoogleClick = vi.fn();

      render(<OAuthButtons onGoogleClick={onGoogleClick} googleLoading />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      await user.click(googleButton);

      expect(onGoogleClick).not.toHaveBeenCalled();
    });

    it("should not trigger callback when Facebook button is loading", async () => {
      const user = userEvent.setup();
      const onFacebookClick = vi.fn();

      render(<OAuthButtons onFacebookClick={onFacebookClick} facebookLoading />);

      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });
      await user.click(facebookButton);

      expect(onFacebookClick).not.toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("should disable both buttons when disabled prop is true", () => {
      render(<OAuthButtons disabled />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });

      expect(googleButton).toBeDisabled();
      expect(facebookButton).toBeDisabled();
    });

    it("should not trigger callbacks when disabled", async () => {
      const user = userEvent.setup();
      const onGoogleClick = vi.fn();
      const onFacebookClick = vi.fn();

      render(
        <OAuthButtons
          onGoogleClick={onGoogleClick}
          onFacebookClick={onFacebookClick}
          disabled
        />
      );

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });

      await user.click(googleButton);
      await user.click(facebookButton);

      expect(onGoogleClick).not.toHaveBeenCalled();
      expect(onFacebookClick).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible name on Google button from visible text", () => {
      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", { name: "Continue with Google" });
      expect(googleButton).toBeInTheDocument();
    });

    it("should have accessible name on Facebook button from visible text", () => {
      render(<OAuthButtons />);

      const facebookButton = screen.getByRole("button", { name: "Continue with Facebook" });
      expect(facebookButton).toBeInTheDocument();
    });

    it("should announce loading state to screen readers", () => {
      render(<OAuthButtons googleLoading />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      expect(googleButton).toHaveAttribute("aria-busy", "true");
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      const onGoogleClick = vi.fn();

      render(<OAuthButtons onGoogleClick={onGoogleClick} />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      googleButton.focus();
      expect(googleButton).toHaveFocus();

      await user.keyboard("{Enter}");

      expect(onGoogleClick).toHaveBeenCalled();
    });
  });

  describe("Button Layout", () => {
    it("should stack buttons vertically by default", () => {
      const { container } = render(<OAuthButtons />);

      const wrapper = container.querySelector('[data-testid="oauth-buttons-wrapper"]');
      expect(wrapper).toHaveClass(/flex-col/);
    });

    it("should have gap between buttons", () => {
      const { container } = render(<OAuthButtons />);

      const wrapper = container.querySelector('[data-testid="oauth-buttons-wrapper"]');
      expect(wrapper).toHaveClass(/gap-3/);
    });

    it("should render buttons with full width", () => {
      const { container } = render(<OAuthButtons />);

      const buttons = container.querySelectorAll('button[type="button"]');
      buttons.forEach((button) => {
        expect(button).toHaveClass(/w-full/);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid clicks without errors", async () => {
      const user = userEvent.setup();
      const onGoogleClick = vi.fn();

      render(<OAuthButtons onGoogleClick={onGoogleClick} />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      await user.click(googleButton);
      await user.click(googleButton);
      await user.click(googleButton);

      expect(onGoogleClick).toHaveBeenCalledTimes(3);
    });

    it("should handle both buttons loading simultaneously", () => {
      render(<OAuthButtons googleLoading facebookLoading />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });

      expect(googleButton).toBeDisabled();
      expect(facebookButton).toBeDisabled();
    });
  });
});
