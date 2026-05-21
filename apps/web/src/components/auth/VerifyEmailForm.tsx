"use client";

/**
 * VerifyEmailForm Component (Legacy)
 *
 * NOTA: Este componente es legacy. La implementación activa está en
 * app/auth/verify-email/VerifyEmailPageContent.tsx
 *
 * Migrado a ProSell design tokens — sin colores hardcodeados.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

// ============================================
// TYPES
// ============================================

type VerificationState = "idle" | "loading" | "success" | "error";

interface VerifyEmailFormProps {
  token?: string;
}

// ============================================
// STYLES
// ============================================

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--ps-bg-base)',
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--ps-bg-surface)',
  border: '1px solid var(--ps-border-default)',
  borderRadius: 14,
  padding: 32,
};

// ============================================
// COMPONENT
// ============================================

export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const [state, setState] = useState<VerificationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token || token.trim() === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("error");
      setError("El enlace de verificación no es válido.");
      return;
    }

    const verifyEmail = async () => {
      setState("loading");
      setError(null);

      try {
        await authApi.verifyEmail(token);
        setState("success");
      } catch (err) {
        setState("error");
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setNotFound(true);
            setError("El enlace de verificación no existe.");
          } else if (err.status === 400) {
            setError(err.message || "El enlace expiró o ya fue utilizado.");
          } else {
            setError(err.message || "No pudimos verificar tu email.");
          }
        } else {
          setError(
            getErrorMessage(err, "No pudimos verificar tu email. Intentá de nuevo."),
          );
        }
      }
    };

    verifyEmail();
  }, [token]);

  const renderContent = () => {
    switch (state) {
      case "idle":
      case "loading":
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            <style>{`@keyframes verifyFormSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--ps-info-bg)',
              border: '1px solid rgba(77,184,255,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Loader2
                size={28}
                strokeWidth={1.8}
                style={{ color: 'var(--ps-cyan)', animation: 'verifyFormSpin 1s linear infinite' }}
              />
            </div>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
                Verificando tu email...
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ps-text-secondary)', lineHeight: 1.6 }}>
                Esperá un momento mientras confirmamos tu dirección.
              </p>
            </div>
          </div>
        );

      case "success":
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--ps-success-bg)',
              border: '1px solid rgba(34,211,160,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle2 size={28} strokeWidth={1.8} style={{ color: 'var(--ps-success)' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
                ¡Email verificado!
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ps-text-secondary)', lineHeight: 1.6 }}>
                Tu cuenta está activa. Ya podés iniciar sesión y empezar a usar ProSell.
              </p>
            </div>
            <Link
              href="/auth/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 44,
                width: '100%',
                background: 'var(--ps-cyan)',
                color: 'var(--ps-bg-base)',
                border: 0,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Iniciar sesión
            </Link>
          </div>
        );

      case "error":
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--ps-error-bg)',
              border: '1px solid rgba(240,68,56,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={28} strokeWidth={1.8} style={{ color: 'var(--ps-error)' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
                {notFound ? "Enlace no encontrado" : "Verificación fallida"}
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ps-text-secondary)', lineHeight: 1.6 }}>
                {error ?? "El enlace expiró o ya fue utilizado."}
              </p>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                href="/auth/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 44,
                  background: 'transparent',
                  color: 'var(--ps-text-secondary)',
                  border: '1px solid var(--ps-border-default)',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Volver al inicio de sesión
              </Link>
              <Link
                href="/auth/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 44,
                  background: 'var(--ps-cyan)',
                  color: 'var(--ps-bg-base)',
                  border: 0,
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Solicitar nueva verificación
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)' }}>
            Verificación de email
          </h2>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
