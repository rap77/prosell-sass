/**
 * OAuthButtons Component
 *
 * Social login buttons for Google and Facebook OAuth providers.
 * Features loading states, disabled state, and full accessibility.
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
   * Base styling classes
   */
  variant: "google" | "facebook";
}

// ============================================
// STYLES
// ============================================

const BUTTON_STYLES = {
  google: {
    base: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200",
    icon: "text-slate-900",
  },
  facebook: {
    base: "bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 focus:ring-blue-500",
    icon: "text-white",
  },
} as const;

// ============================================
// OAUTH BUTTON COMPONENT
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

  return (
    <button
      {...props}
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        // Base styles
        "w-full relative flex items-center justify-center gap-3",
        "px-4 py-2.5 rounded-lg font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        // Disabled state
        "disabled:opacity-50 disabled:cursor-not-allowed",
        // Variant-specific styles
        BUTTON_STYLES[variant].base,
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
        <span className={cn("w-5 h-5 flex items-center justify-center", BUTTON_STYLES[variant].icon)}>
          {icon}
        </span>
      )}

      {/* Button text */}
      <span>{label}</span>
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * OAuthButtons component for social login
 *
 * Features:
 * - Google and Facebook OAuth buttons
 * - Individual loading states per provider
 * - Full keyboard navigation
 * - Accessible ARIA attributes
 * - Prevents double-clicks during loading
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
        icon={
          // Google "G" logo SVG
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="w-full h-full"
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        }
      />

      {/* Facebook OAuth Button */}
      <OAuthButton
        label="Continue with Facebook"
        variant="facebook"
        isLoading={facebookLoading}
        disabled={disabled}
        onClick={onFacebookClick}
        icon={
          // Facebook "f" logo SVG
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="w-full h-full"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        }
      />
    </div>
  );
}
