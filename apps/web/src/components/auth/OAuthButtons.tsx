/**
 * OAuthButtons Component
 *
 * Social login buttons for Google and Facebook OAuth providers.
 * Features loading states, disabled state, and full accessibility.
 * Uses chadcn/ui Button component.
 *
 * @example
 * ```tsx
 * <OAuthButtons
 *   onGoogleClick={() => signIn('google')}
 *   onFacebookClick={() => signIn('facebook')}
 *   googleLoading={isGoogleLoading}
 *   facebookLoading={isFacebookLoading}
 * />
 * ```
 */
"use client";

import { type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon, FacebookIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface OAuthButtonsProps {
  /**
   * Callback when Google button is clicked
   */
  onGoogleClick?: () => void;

  /**
   * Callback when Facebook button is clicked
   */
  onFacebookClick?: () => void;

  /**
   * Show loading state on Google button
   */
  googleLoading?: boolean;

  /**
   * Show loading state on Facebook button
   */
  facebookLoading?: boolean;

  /**
   * Disable both buttons
   */
  disabled?: boolean;
}

// ============================================
// BUTTON PROPS TYPE
// ============================================

interface OAuthButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
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
 * Individual OAuth button with loading state
 */
function OAuthButton({
  label,
  isLoading = false,
  icon,
  variant,
  disabled,
  onClick,
  className,
  ...props
}: OAuthButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading || disabled) {
      return;
    }

    // Call onClick callback (handles its own errors)
    onClick?.(e);
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
        variant === "google" && "bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        variant === "facebook" && "bg-[#1877F2] hover:bg-[#166FE5] text-white border-[#1877F2]",
        className
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
        <span className="w-5 h-5 flex items-center justify-center">
          {icon}
        </span>
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
 * - Individual loading states per provider
 * - Full keyboard navigation
 * - Accessible ARIA attributes
 * - Prevents double-clicks during loading
 * - chadcn/ui Button components
 */
export function OAuthButtons({
  onGoogleClick,
  onFacebookClick,
  googleLoading = false,
  facebookLoading = false,
  disabled = false,
}: OAuthButtonsProps) {
  return (
    <div
      data-testid="oauth-buttons-wrapper"
      className="flex flex-col gap-3 w-full"
    >
      {/* Google OAuth Button */}
      <OAuthButton
        label="Continue with Google"
        variant="google"
        isLoading={googleLoading}
        disabled={disabled}
        onClick={onGoogleClick}
        icon={<GoogleIcon />}
      />

      {/* Facebook OAuth Button */}
      <OAuthButton
        label="Continue with Facebook"
        variant="facebook"
        isLoading={facebookLoading}
        disabled={disabled}
        onClick={onFacebookClick}
        icon={<FacebookIcon />}
      />
    </div>
  );
}
