/**
 * TDD: useAuth — RBAC convenience getters (Subsystem D Phase 5)
 *
 * Task 5.1: `isAdmin` / `isSuperAdmin` / `hasPermission` / `permissions`
 * derived from `user.role`, mirroring the backend's `ROLE_PERMISSIONS`
 * map (apps/api/src/prosell/domain/entities/role.py).
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { Permission } from "@/lib/auth/permissions";

const mockUseAuthStore = vi.fn();

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

import { useAuth } from "@/hooks/useAuth";

function setUserRole(role: string | null) {
  mockUseAuthStore.mockReturnValue({
    user: role
      ? {
          id: "1",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          role,
        }
      : null,
    isAuthenticated: !!role,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    clearError: vi.fn(),
  });
}

describe("useAuth — RBAC getters", () => {
  it("isAdmin is true for the admin role", () => {
    setUserRole("admin");
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAdmin).toBe(true);
  });

  it("isAdmin is false for sales_user", () => {
    setUserRole("sales_user");
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAdmin).toBe(false);
  });

  it("isAdmin is true for super_admin too", () => {
    setUserRole("super_admin");
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAdmin).toBe(true);
  });

  it("isSuperAdmin is only true for super_admin", () => {
    setUserRole("super_admin");
    expect(renderHook(() => useAuth()).result.current.isSuperAdmin).toBe(true);

    setUserRole("admin");
    expect(renderHook(() => useAuth()).result.current.isSuperAdmin).toBe(false);
  });

  it("hasPermission reflects DEALER_ADMIN_VIEW_ALL for admin but not sales_user", () => {
    setUserRole("admin");
    const admin = renderHook(() => useAuth());
    expect(
      admin.result.current.hasPermission(Permission.DEALER_ADMIN_VIEW_ALL),
    ).toBe(true);

    setUserRole("sales_user");
    const seller = renderHook(() => useAuth());
    expect(
      seller.result.current.hasPermission(Permission.DEALER_ADMIN_VIEW_ALL),
    ).toBe(false);
  });

  it("permissions is empty when there is no authenticated user", () => {
    setUserRole(null);
    const { result } = renderHook(() => useAuth());

    expect(result.current.permissions).toEqual([]);
    expect(result.current.isAdmin).toBe(false);
  });
});
