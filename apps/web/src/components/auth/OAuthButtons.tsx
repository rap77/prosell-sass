/**
 * OAuthButtons Component
 *
 * Social login buttons for Google and Facebook OAuth providers.
 * Features loading states, disabled state, and full accessibility.
 * Uses chadcn/ui Button component.
 *
 * OAuth Flow:
 * 1. User clicks button → Redirects to /api/v1/auth/oauth/{provider}/authorize
 * 2. Backend generates state token → Redirects to Google/Facebook
 * 3. User authenticates at provider → Provider redirects to backend callback
 * 4. Backend exchanges code for tokens → Sets httpOnly cookies → Redirects to dashboard
 *
 * @example
 * ```tsx
 * <OAuthButtons />
 * ```
 */
"use client";

import { type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSvgWrapper } from "@/components/ui";
import { GoogleIcon, FacebookIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface OAuthButtonsProps {
  /**
   * Disable both buttons
   */
  disabled?: boolean;

  /**
   * Callback when mouse enters the button container
   * Used for intent-based preload optimization
   */
  onMouseEnter?: () => void;
}

// ============================================
// BUTTON PROPS TYPE
// ============================================

interface OAuthButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /**
   * Button label text
   */
  label: string;

  /**
   * Whether button is in loading state
   */
  isLoading?: boolean;

  /**
   * Icon to display
   */
  icon: React.ReactNode;

  /**
   * Button variant for chadcn/ui
   */
  variant: "google" | "facebook";
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Individual OAuth button with loading state.
 *
 * Redirects to backend OAuth authorize endpoint on click.
 * Backend handles full OAuth flow and redirects back with cookies.
 */
function OAuthButton({
  label,
  isLoading = false,
  icon,
  variant,
  disabled,
  className,
  ...props
}: OAuthButtonProps) {
  /**
   * Handle OAuth button click.
   *
   * Redirects browser to backend OAuth authorize endpoint.
   * Backend will:
   * 1. Generate state token (CSRF protection)
   * 2. Redirect to Google/Facebook
   * 3. Process callback
   * 4. Set httpOnly cookies
   * 5. Redirect back to frontend dashboard
   */
  const handleClick = () => {
    if (isLoading || disabled) {
      return;
    }

    // Redirect to backend OAuth authorize endpoint
    // Provider is determined by variant ("google" or "facebook")
    window.location.href = `/api/v1/auth/oauth/${variant}/authorize`;
  };

  // chadcn/ui variants for OAuth buttons
  const buttonVariant = variant === "google" ? "outline" : "default";

  return (
    <Button
      {...props}
      type="button"
      variant={buttonVariant}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        "w-full",
        variant === "google" &&
          "bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        variant === "facebook" &&
          "bg-[#1877F2] hover:bg-[#166FE5] text-white border-[#1877F2]",
        className,
      )}
    >
      {/* Icon or loading spinner */}
      {isLoading ? (
        <Loader2
          className="w-5 h-5 animate-spin"
          data-present="loader-icon"
          aria-hidden="true"
        />
      ) : (
        <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      )}

      {/* Button text */}
      <span>{label}</span>
    </Button>
  );
}

/**
 * OAuthButtons component for social login
 *
 * Features:
 * - Google and Facebook OAuth buttons
 * - Redirects to backend OAuth authorize endpoint
 * - Full keyboard navigation
 * - Accessible ARIA attributes
 * - Prevents double-clicks during loading
 * - chadcn/ui Button components
 *
 * OAuth Flow:
 * 1. User clicks button → Redirects to /api/v1/auth/oauth/{provider}/authorize
 * 2. Backend generates state token → Redirects to Google/Facebook
 * 3. User authenticates → Provider redirects to backend callback
 * 4. Backend sets httpOnly cookies → Redirects to frontend dashboard
 */
export function OAuthButtons({
  disabled = false,
  onMouseEnter,
}: OAuthButtonsProps) {
  return (
    <div
      data-testid="oauth-buttons-wrapper"
      className="flex flex-col gap-3 w-full"
      onMouseEnter={onMouseEnter}
    >
      {/* Google OAuth Button */}
      <OAuthButton
        label="Continue with Google"
        variant="google"
        isLoading={false}
        disabled={disabled}
        icon={
          <AnimatedSvgWrapper animation="fadeIn" duration={300}>
            <GoogleIcon />
          </AnimatedSvgWrapper>
        }
        data-testid="google-oauth-button"
      />

      {/* Facebook OAuth Button */}
      <OAuthButton
        label="Continue with Facebook"
        variant="facebook"
        isLoading={false}
        disabled={disabled}
        icon={
          <AnimatedSvgWrapper animation="fadeIn" duration={300}>
            <FacebookIcon />
          </AnimatedSvgWrapper>
        }
        data-testid="facebook-oauth-button"
      />
    </div>
  );
}
