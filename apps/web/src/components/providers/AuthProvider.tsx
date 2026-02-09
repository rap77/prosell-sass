/**
 * AuthProvider - Component to provide auth context and initialize auth state
 *
 * This component ensures proper authentication state initialization
 * and prevents hydration mismatches between server and client.
 *
 * Usage:
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */

"use client";

import { ReactNode } from "react";
import { useAuthInitializer } from "@/hooks/useAuthInitializer";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const isLoading = useAuthInitializer();

  // Show loading spinner while initializing auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
