"use client";

/**
 * VerifyEmailPageContent — ProSell email-verification screen.
 * Uses AuthShell for the split brand+form layout.
 * Auto-verifies on mount using React Query.
 * States: loading → success | error (no-token, api-error)
 */

import { useQuery } from "@tanstack/react-query";
import { authApi, ApiError } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  AuthShell,
  AuthStatusBadge,
  AuthCtaLink,
} from "@/components/auth/AuthShell";

// ─── Error message mapper ─────────────────────────────────────────────────────

function mapVerifyError(err: unknown): { message: string; notFound: boolean } {
  if (err instanceof ApiError) {
    if (err.status === 404) {
      return {
        message: "El enlace de verificación no existe.",
        notFound: true,
      };
    }
    if (err.status === 400) {
      return {
        message: err.message || "El enlace expiró o ya fue utilizado.",
        notFound: false,
      };
    }
    return {
      message: err.message || "No pudimos verificar tu email.",
      notFound: false,
    };
  }
  return {
    message: getErrorMessage(
      err,
      "No pudimos verificar tu email. Intentá de nuevo.",
    ),
    notFound: false,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface VerifyEmailPageContentProps {
  token?: string;
}

export function VerifyEmailPageContent({ token }: VerifyEmailPageContentProps) {
  const hasToken = Boolean(token && token.trim() !== "");

  const verifyQuery = useQuery({
    queryKey: ["verify-email", token],
    queryFn: async () => {
      if (!token) throw new Error("No token");
      await authApi.verifyEmail(token);
      return { success: true };
    },
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // ── No token ───────────────────────────────────────────────────────────────
  if (!hasToken) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-5 text-center">
          <AuthStatusBadge variant="error">
            <AlertTriangle size={28} strokeWidth={1.8} />
          </AuthStatusBadge>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-2 text-foreground">
              Enlace inválido
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px] m-0">
              El enlace de verificación no es válido.
            </p>
          </div>
          <div className="w-full flex flex-col gap-2.5">
            <AuthCtaLink href="/auth/register">Volver al registro</AuthCtaLink>
            <AuthCtaLink href="/auth/login" variant="secondary">
              Iniciar sesión
            </AuthCtaLink>
          </div>
        </div>
      </AuthShell>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (verifyQuery.isPending) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-5 text-center">
          <AuthStatusBadge variant="loading">
            <Loader2 size={28} strokeWidth={1.8} className="animate-spin" />
          </AuthStatusBadge>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-2 text-foreground">
              Verificando tu email...
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed m-0">
              Esperá un momento mientras confirmamos tu dirección de email.
            </p>
          </div>
        </div>
      </AuthShell>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (verifyQuery.isSuccess) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-5 text-center">
          <AuthStatusBadge variant="success">
            <CheckCircle2 size={28} strokeWidth={1.8} />
          </AuthStatusBadge>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-2 text-foreground">
              ¡Email verificado!
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px] m-0">
              Tu cuenta está activa. Ya podés iniciar sesión y empezar a usar
              ProSell.
            </p>
          </div>
          <div className="w-full">
            <AuthCtaLink href="/auth/login">Iniciar sesión</AuthCtaLink>
          </div>
        </div>
      </AuthShell>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  const { message, notFound } = mapVerifyError(verifyQuery.error);

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-5 text-center">
        <AuthStatusBadge variant="error">
          <AlertTriangle size={28} strokeWidth={1.8} />
        </AuthStatusBadge>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-2 text-foreground">
            {notFound ? "Enlace no encontrado" : "Verificación fallida"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px] m-0">
            {message}
          </p>
        </div>
        <div className="w-full flex flex-col gap-2.5">
          <AuthCtaLink href="/auth/register">Volver al registro</AuthCtaLink>
          <AuthCtaLink href="/auth/login" variant="secondary">
            Iniciar sesión
          </AuthCtaLink>
        </div>
      </div>
    </AuthShell>
  );
}
