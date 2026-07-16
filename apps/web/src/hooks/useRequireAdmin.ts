/**
 * useRequireAdmin - Client-side admin gate for /admin/* pages.
 *
 * Redirects to /dashboard when the current user is not an admin. This is a
 * UX nicety only — the real boundary is the server-side
 * Permission.ORG_ADMIN_VIEW_ALL check and the edge middleware in proxy.ts.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function useRequireAdmin(): boolean {
  const router = useRouter();
  const { isAdmin, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // ponytail: wait until auth is loaded before redirecting
    // prevents race condition with zustand hydration
    if (!isLoading && isAuthenticated && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, isAuthenticated, isLoading, router]);

  return isAdmin;
}
