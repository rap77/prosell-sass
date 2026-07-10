/**
 * AuthProvider — inicializa el estado de auth en ProSell.
 *
 * Garantiza la inicialización correcta del estado de autenticación
 * y previene hydration mismatches entre server y client.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

"use client";

import { ReactNode } from "react";
import { useAuthInitializer } from "@/hooks/useAuthInitializer";
import { Loader2 } from "lucide-react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const isLoading = useAuthInitializer();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ps-bg-base)",
          animation: "authFadeIn 0.2s ease-out",
        }}
      >
        <style>{`
          @keyframes authSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
        <div style={{ textAlign: "center" }}>
          <Loader2
            size={40}
            strokeWidth={1.5}
            style={{
              color: "var(--ps-cyan)",
              animation: "authSpin 0.8s linear infinite",
            }}
          />
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }}
          >
            Cargando sesión...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
