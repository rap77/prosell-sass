"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

/**
 * Clears the isNavigating flag after the component mounts.
 * ponytail: mount this in protected layouts to signal navigation is complete.
 */
export function NavigationCleanup() {
  const setNavigating = useAuthStore((s) => s.setNavigating);

  useEffect(() => {
    // Clear flag after mount - navigation is complete
    setNavigating(false);
  }, [setNavigating]);

  return null;
}
