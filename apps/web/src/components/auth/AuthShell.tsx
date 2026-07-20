"use client";

/**
 * AuthShell — Shared split-layout wrapper for all auth screens.
 *
 * Left:  ProSell brand panel (gradient + testimonial)
 * Right: Form area — receives `children`
 *
 * Responsive: left panel hides on mobile (via .ps-auth-split CSS rule in globals.css).
 */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// ─── Brand panel (left side) ──────────────────────────────────────────────────
// ponytail: decorative gradients/glows kept inline — they're view-specific, not reusable

function AuthBrandPanel() {
  return (
    <aside
      aria-hidden="true"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "48px 56px",
        background:
          "linear-gradient(135deg, #060D24 0%, #0D1B6E 60%, #1E5FD4 100%)",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(77,184,255,0.18), transparent 70%)",
        }}
      />
      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <Link
          href="/"
          tabIndex={-1}
          className="inline-flex items-center gap-3 text-[22px] font-bold tracking-tight text-white no-underline"
        >
          <Image
            src="/logo-mark.png"
            alt="ProSell"
            width={271}
            height={294}
            className="h-[34px] w-auto shrink-0"
          />
          ProSell
        </Link>

        {/* Hero + testimonial */}
        <div className="flex-1 flex flex-col justify-center gap-[18px] max-w-[480px] my-auto py-8">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white m-0">
            Tu pipeline,
            <br />
            centralizado.
          </h2>
          <p className="text-base leading-relaxed text-white/70 max-w-[380px] m-0">
            Miles de equipos comerciales ya cierran más rápido con ProSell.
          </p>

          <figure
            style={{
              margin: "12px 0 0",
              background: "rgba(13,27,62,0.45)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: 12,
              padding: "22px 24px",
              boxShadow:
                "0 16px 48px rgba(6,13,36,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="text-ps-warning text-[13px] tracking-wider mb-3">
              ★★★★★
            </div>
            <blockquote className="text-[15px] leading-relaxed italic text-white m-0 mb-3.5 tracking-tight">
              &ldquo;Pasamos de perder el 40% de leads a cerrar el doble en el
              mismo tiempo.&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-2.5 text-[13px] text-white/75">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-ps-cyan to-ps-blue inline-flex items-center justify-center text-[11px] font-bold text-background shrink-0">
                MR
              </span>
              <span>
                <b className="text-white font-semibold">Martín R.</b>{" "}
                <span className="text-white/55">· Gerente Comercial</span>
              </span>
            </figcaption>
          </figure>
        </div>

        {/* Status footer */}
        <div className="flex items-center gap-2 text-xs text-white/50">
          {/* ponytail: glow effect kept inline — decorative, unique to this indicator */}
          <span
            className="w-1.5 h-1.5 rounded-full bg-ps-success inline-block shrink-0"
            style={{ boxShadow: "0 0 6px var(--ps-success)" }}
          />
          Todos los sistemas operativos · v2.4.1
        </div>
      </div>
    </aside>
  );
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ps-auth-split grid grid-cols-[1.05fr_1fr] min-h-screen">
      <AuthBrandPanel />

      <main className="bg-background flex flex-col justify-center items-center p-12">
        <div className="w-full max-w-[400px] flex flex-col gap-5">
          {children}
        </div>
      </main>
    </div>
  );
}

// ─── Form heading helper ───────────────────────────────────────────────────────

export function AuthFormHead({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight leading-tight mb-1.5 text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Auth Input (styled wrapper around shadcn Input) ──────────────────────────

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const AuthInput = ({
  hasError,
  className,
  ...props
}: AuthInputProps) => (
  <Input
    className={cn(
      "h-11 text-[15px]",
      "focus:border-primary focus:ring-2 focus:ring-primary/20",
      hasError &&
        "border-destructive focus:border-destructive focus:ring-destructive/20",
      className,
    )}
    {...props}
  />
);

// ─── Shared sub-components ────────────────────────────────────────────────────

export function AuthFieldError({ message }: { message: string }) {
  return (
    <span
      role="alert"
      className="inline-flex items-center gap-1.5 text-xs text-destructive mt-1.5"
    >
      <AlertCircle size={12} strokeWidth={2.5} />
      {message}
    </span>
  );
}

export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-ps-error-bg border border-destructive/25">
      <AlertCircle
        size={14}
        className="text-destructive shrink-0"
        strokeWidth={2.5}
      />
      <p role="alert" className="m-0 text-[13px] text-destructive">
        {message}
      </p>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3.5 text-ps-tertiary text-xs">
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      {label}
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

export function AuthSubmitButton({
  label,
  loadingLabel,
  isLoading,
  disabled,
}: {
  label: string;
  loadingLabel: string;
  isLoading: boolean;
  disabled: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      className="mt-2 w-full h-11 text-[15px] font-semibold"
    >
      {isLoading && <Loader2 className="animate-spin" />}
      {isLoading ? loadingLabel : label}
    </Button>
  );
}

// ─── Re-export Label for convenience ──────────────────────────────────────────

export { Label as AuthLabel };

// ─── Password Input with toggle ─────────────────────────────────────────────

export interface AuthPasswordInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  hasError?: boolean;
}

export function AuthPasswordInput({
  hasError,
  className,
  ...props
}: AuthPasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <AuthInput
        type={show ? "text" : "password"}
        hasError={hasError}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => {
          e.preventDefault();
          setShow((v) => !v);
        }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ps-tertiary hover:text-foreground"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ─── OAuth Button ───────────────────────────────────────────────────────────

export function AuthOAuthButton({
  label,
  icon,
  loading,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "h-10 text-[13px] font-medium",
        loading && "opacity-60 cursor-not-allowed",
      )}
    >
      {icon}
      {label}
    </Button>
  );
}

// ─── Status Icon Badge ──────────────────────────────────────────────────────

export function AuthStatusBadge({
  variant,
  children,
}: {
  variant: "loading" | "success" | "error";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-16 h-16 rounded-full inline-flex items-center justify-center border",
        variant === "loading" && "bg-ps-info-bg border-primary/25 text-primary",
        variant === "success" &&
          "bg-ps-success-bg border-ps-success/25 text-ps-success",
        variant === "error" &&
          "bg-ps-error-bg border-destructive/25 text-destructive",
      )}
    >
      {children}
    </div>
  );
}

// ─── CTA Link Button ────────────────────────────────────────────────────────

export function AuthCtaLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center h-11 w-full rounded-lg text-[15px] font-semibold no-underline tracking-tight",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "secondary" &&
          "bg-transparent border border-border text-muted-foreground text-sm font-medium",
      )}
    >
      {children}
    </Link>
  );
}

// ─── Back Link ──────────────────────────────────────────────────────────────

export function AuthBackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <p className="text-center m-0">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground no-underline font-medium hover:text-foreground"
      >
        {children}
      </Link>
    </p>
  );
}

// ─── Footer Link ────────────────────────────────────────────────────────────

export function AuthFooterLink({
  text,
  href,
  linkText,
}: {
  text: string;
  href: string;
  linkText: string;
}) {
  return (
    <p className="text-center text-[13px] text-muted-foreground m-0">
      {text}
      <Link
        href={href}
        className="text-primary no-underline font-semibold ml-1"
      >
        {linkText}
      </Link>
    </p>
  );
}

// ─── Legacy exports (deprecated — remove after full migration) ────────────────
// ponytail: keep for backwards compat until all auth pages are migrated

/** @deprecated Use AuthInput component instead */
export const authInputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  height: 44,
  padding: "0 14px",
  background: "var(--ps-input-bg)",
  border: `1px solid ${hasError ? "var(--ps-error)" : "var(--ps-input-border)"}`,
  borderRadius: 8,
  color: "var(--ps-text-primary)",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 180ms, box-shadow 180ms, background 180ms",
});

/** @deprecated Use AuthInput component instead */
export function focusAuthInput(el: HTMLInputElement, hasError: boolean) {
  el.style.borderColor = hasError ? "var(--ps-error)" : "var(--ps-cyan)";
  el.style.boxShadow = hasError
    ? "0 0 0 3px var(--ps-input-error-shadow)"
    : "0 0 0 3px var(--ps-input-focus-shadow)";
  el.style.background = "var(--ps-input-bg-focus)";
}

/** @deprecated Use AuthInput component instead */
export function blurAuthInput(el: HTMLInputElement, hasError: boolean) {
  el.style.borderColor = hasError
    ? "var(--ps-error)"
    : "var(--ps-input-border)";
  el.style.boxShadow = "none";
  el.style.background = "var(--ps-input-bg)";
}
