/**
 * useAuthInitializer - Hook to initialize auth state on client mount
 *
 * This hook ensures proper hydration of the authStore by:
 * 1. Setting loading state to true initially
 * 2. Fetching auth state from server on mount
 * 3. Updating store with server-side auth state
 * 4. Setting loading state to false when done
 *
 * This prevents hydration mismatches between server and client.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function useAuthInitializer() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    // Only initialize once when the component mounts
    initializeAuth();
  }, [initializeAuth]);

  // Return loading state for components that need to show loading indicators
  return isLoading;
}
