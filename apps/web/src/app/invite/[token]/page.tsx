"use client";

/**
 * Página de aceptación de invitación al equipo — ProSell.
 *
 * Flujo:
 * 1. El usuario hace click en el link del email con el token: /invite/abc123...
 * 2. La página valida el token con el backend
 * 3. El usuario es agregado al equipo
 * 4. Redirección al dashboard con mensaje de bienvenida
 *
 * Estados de error:
 * - Token inválido       → Mostrar error, opción de ir al inicio
 * - Token vencido        → Mostrar error, opción de solicitar nueva invitación
 * - Ya es miembro        → Mostrar mensaje, redirigir al dashboard
 * - No autenticado       → Redirigir al login guardando el token
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { teamApi, ApiError } from "@/lib/api/teamApi";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

type InvitationState =
  | "loading"
  | "success"
  | "error"
  | "expired"
  | "already_member";

// ============================================
// COMPONENT
// ============================================

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const [state, setState] = useState<InvitationState>("loading");
  const [message, setMessage] = useState<string>("");
  const [, setTeamName] = useState<string>("");

  const acceptInvitation = async () => {
    try {
      const member = await teamApi.acceptInvitation({ token });

      setState("success");
      setTeamName(member.team_id || "el equipo");
      setMessage("Te uniste exitosamente al equipo.");

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard?welcome=team");
      }, 2000);
    } catch (error) {
      if (error instanceof ApiError) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("expired")) {
          setState("expired");
          setMessage(
            "Esta invitación venció. Pedile al administrador que te envíe una nueva.",
          );
        } else if (
          errorMessage.includes("already") ||
          errorMessage.includes("member")
        ) {
          setState("already_member");
          setMessage("Ya sos parte de este equipo.");
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else if (error.status === 401) {
          // No autenticado — redirigir al login con return URL
          const returnUrl = encodeURIComponent(`/invite/${token}`);
          router.push(`/auth/login?returnTo=${returnUrl}`);
        } else {
          setState("error");
          setMessage(
            error.message ||
              "No se pudo aceptar la invitación. Intentá de nuevo o contactá al soporte.",
          );
        }
      } else {
        setState("error");
        setMessage("Ocurrió un error inesperado. Intentá de nuevo.");
      }
    }
  };

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- guard pattern, not a cascade
      setState("error");
      setMessage("No se proporcionó el token de invitación");
      return;
    }
    void acceptInvitation();
  }, [token]);

  // ── Contenido por estado ──
  const renderContent = (): React.ReactNode => {
    switch (state) {
      case "loading":
        return (
          <div className="flex flex-col items-center gap-4">
            <Loader2
              className="animate-spin text-ps-cyan [animation-duration:0.8s]"
              size={48}
              strokeWidth={1.5}
            />
            <p className="m-0 text-sm text-ps-text-secondary">
              Procesando tu invitación...
            </p>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2
              className="text-ps-success"
              size={48}
              strokeWidth={1.5}
            />
            <div className="text-center">
              <h3 className="m-0 text-base font-bold text-ps-success">
                ¡Bienvenido al equipo!
              </h3>
              <p className="mt-1.5 mb-0 text-[13px] text-ps-text-secondary">
                {message}
              </p>
            </div>
            <p className="m-0 text-xs text-ps-text-tertiary">
              Redirigiendo al dashboard...
            </p>
          </div>
        );

      case "expired":
        return (
          <div className="flex flex-col items-center gap-4">
            <XCircle
              className="text-ps-error"
              size={48}
              strokeWidth={1.5}
            />
            <div className="text-center">
              <h3 className="m-0 text-base font-bold text-ps-error">
                Invitación vencida
              </h3>
              <p className="mt-1.5 mb-0 text-[13px] text-ps-text-secondary">
                {message}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-[38px] items-center rounded-lg border border-ps-border-default bg-ps-elevated px-5 text-[13px] font-medium text-ps-text-secondary no-underline"
            >
              Ir al inicio
            </Link>
          </div>
        );

      case "already_member":
        return (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2
              className="text-ps-cyan"
              size={48}
              strokeWidth={1.5}
            />
            <div className="text-center">
              <h3 className="m-0 text-base font-bold text-ps-cyan">
                Ya sos miembro
              </h3>
              <p className="mt-1.5 mb-0 text-[13px] text-ps-text-secondary">
                {message}
              </p>
            </div>
            <p className="m-0 text-xs text-ps-text-tertiary">
              Redirigiendo al dashboard...
            </p>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center gap-4">
            <AlertCircle
              className="text-ps-warning"
              size={48}
              strokeWidth={1.5}
            />
            <div className="text-center">
              <h3 className="m-0 text-base font-bold text-ps-warning">
                No pudimos procesar la invitación
              </h3>
              <p className="mt-1.5 mb-0 text-[13px] text-ps-text-secondary">
                {message}
              </p>
            </div>
            <div className="flex gap-2.5">
              <Link
                href="/"
                className="inline-flex h-[38px] items-center rounded-lg border border-ps-border-default bg-ps-elevated px-4 text-[13px] font-medium text-ps-text-secondary no-underline"
              >
                Ir al inicio
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-[38px] cursor-pointer items-center rounded-lg border-0 bg-ps-cyan px-4 text-[13px] font-bold text-ps-base"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        );
    }
  };

  const subtitle = (): string | null => {
    if (state === "loading")
      return "Aguardá mientras procesamos tu invitación...";
    if (state === "success") return "Invitación aceptada con éxito";
    if (state === "error" || state === "expired")
      return "No pudimos procesar tu invitación";
    return null;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ps-bg-base px-6 py-8">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-7 text-center">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-ps-text-primary no-underline"
          >
            ProSell
          </Link>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-[14px] border border-ps-border-default bg-ps-bg-surface shadow-[0_4px_24px_rgba(6,13,36,0.3)]">
          {/* Header */}
          <div className="border-b border-ps-border-default px-7 pb-5 pt-6 text-center">
            <h1 className="m-0 text-xl font-bold tracking-tight text-ps-text-primary">
              Invitación al equipo
            </h1>
            {subtitle() && (
              <p className="m-0 mt-1.5 text-[13px] text-ps-text-secondary">
                {subtitle()}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="px-7 pb-8 pt-7">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
