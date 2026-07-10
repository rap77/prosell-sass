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

  // ponytail: skip loader if already authenticated (prevents post-login flash)
  if (isLoading && !isAuthenticated) {
    return <FullPageLoader message="Cargando sesión..." />;
  }

  return <>{children}</>;
}
