/**
 * AuthProvider — inicializa el estado de auth en ProSell.
 *
 * Garantiza la inicialización correcta del estado de autenticación
 * y previene hydration mismatches entre server y client.
 */

"use client";

import { ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthInitializer } from "@/hooks/useAuthInitializer";
import { FullPageLoader } from "@/components/ui/FullPageLoader";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const isLoading = useAuthInitializer();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isNavigating = useAuthStore((s) => s.isNavigating);

  // ponytail: show loader during initial auth check (when not yet authenticated)
  if (isLoading && !isAuthenticated) {
    return <FullPageLoader message="Cargando sesión..." />;
  }

  // ponytail: show loader during post-login navigation (flag survives component unmount)
  if (isNavigating) {
    return <FullPageLoader message="Entrando..." />;
  }

  return <>{children}</>;
}
