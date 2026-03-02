/**
 * TDD: OAuthButtons Component Tests
 *
 * OAuth Flow:
 * 1. User clicks button → Redirects to /api/v1/auth/oauth/{provider}/authorize
 * 2. Backend generates state token → Redirects to Google/Facebook
 * 3. User authenticates → Provider redirects to backend callback
 * 4. Backend sets httpOnly cookies → Redirects to frontend dashboard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

describe("OAuthButtons Component", () => {
  // Mock location.href as writable string
  const mockLocation = { href: "" };
  const originalLocation = window.location;

  beforeEach(() => {
    // Reset mock before each test
    mockLocation.href = "";
    // Mock window.location.href
    vi.stubGlobal("location", mockLocation);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe("Basic Rendering", () => {
    it("should render Google and Facebook buttons", () => {
      render(<OAuthButtons />);

      expect(
        screen.getByRole("button", { name: /continue with google/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /continue with facebook/i }),
      ).toBeInTheDocument();
    });

    it("should render Google button with outline variant", () => {
      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      // chadcn/ui outline variant applies different classes
      expect(googleButton).toHaveClass(/inline-flex/);
      expect(googleButton).toHaveClass(/items-center/);
    });

    it("should render Facebook button with default styling", () => {
      render(<OAuthButtons />);

      const facebookButton = screen.getByRole("button", {
        name: /continue with facebook/i,
      });
      // chadcn/ui Button uses flex classes
      expect(facebookButton).toHaveClass(/inline-flex/);
      expect(facebookButton).toHaveClass(/items-center/);
    });

    it("should render both buttons with icons", () => {
      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      const facebookButton = screen.getByRole("button", {
        name: /continue with facebook/i,
      });

      expect(googleButton.querySelector("svg")).toBeInTheDocument();
      expect(facebookButton.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("OAuth Redirect Flow", () => {
    it("should redirect to Google OAuth authorize endpoint when Google button clicked", async () => {
      const user = userEvent.setup();

      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      await user.click(googleButton);

      // Verify redirect to backend OAuth authorize endpoint
      expect(window.location.href).toBe("http://localhost:8000/api/auth/oauth/google/authorize");
    });

    it("should redirect to Facebook OAuth authorize endpoint when Facebook button clicked", async () => {
      const user = userEvent.setup();

      render(<OAuthButtons />);

      const facebookButton = screen.getByRole("button", {
        name: /continue with facebook/i,
      });
      await user.click(facebookButton);

      // Verify redirect to backend OAuth authorize endpoint
      expect(window.location.href).toBe("http://localhost:8000/api/auth/oauth/facebook/authorize");
    });
  });

  describe("Disabled State", () => {
    it("should disable both buttons when disabled prop is true", () => {
      render(<OAuthButtons disabled />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      const facebookButton = screen.getByRole("button", {
        name: /continue with facebook/i,
      });

      expect(googleButton).toBeDisabled();
      expect(facebookButton).toBeDisabled();
    });

    it("should not redirect when disabled button is clicked", async () => {
      const user = userEvent.setup();

      render(<OAuthButtons disabled />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      await user.click(googleButton);

      // Should not redirect
      expect(window.location.href).toBe("");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels on buttons", () => {
      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      const facebookButton = screen.getByRole("button", {
        name: /continue with facebook/i,
      });

      expect(googleButton).toHaveAttribute("type", "button");
      expect(facebookButton).toHaveAttribute("type", "button");
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();

      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });

      // Tab to button
      await user.tab();
      expect(googleButton).toHaveFocus();

      // Enter should trigger redirect
      await user.keyboard("{Enter}");
      expect(window.location.href).toBe("http://localhost:8000/api/auth/oauth/google/authorize");
    });
  });
});
