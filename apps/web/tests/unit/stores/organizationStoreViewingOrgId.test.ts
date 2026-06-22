/**
 * TDD: organizationStore.viewingOrgId — Subsystem D Phase 5.5/5.6
 *
 * The dealer picker (Phase 6) lets an admin "view as" another dealer's
 * organization. The setter must be a no-op for any caller without
 * Permission.DEALER_ADMIN_VIEW_ALL — guarded here at the store level so
 * the guard holds regardless of which component calls it.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useAuthStore } from "@/stores/authStore";

function setRole(role: string | null) {
  useAuthStore.setState({
    user: role
      ? {
          id: "1",
          email: "user@example.com",
          first_name: "Test",
          last_name: "User",
          role,
        }
      : null,
  });
}

describe("organizationStore.viewingOrgId", () => {
  beforeEach(() => {
    useOrganizationStore.setState({ viewingOrgId: null });
    setRole(null);
  });

  it("defaults to null", () => {
    expect(useOrganizationStore.getState().viewingOrgId).toBeNull();
  });

  it("sets viewingOrgId for a user with DEALER_ADMIN_VIEW_ALL (admin)", () => {
    setRole("admin");

    useOrganizationStore.getState().setViewingOrgId("dealer-123");

    expect(useOrganizationStore.getState().viewingOrgId).toBe("dealer-123");
  });

  it("is a no-op for a user without DEALER_ADMIN_VIEW_ALL (sales_user)", () => {
    setRole("sales_user");

    useOrganizationStore.getState().setViewingOrgId("dealer-123");

    expect(useOrganizationStore.getState().viewingOrgId).toBeNull();
  });

  it("is a no-op when there is no authenticated user", () => {
    setRole(null);

    useOrganizationStore.getState().setViewingOrgId("dealer-123");

    expect(useOrganizationStore.getState().viewingOrgId).toBeNull();
  });

  it("clearing back to null is allowed for an admin", () => {
    setRole("super_admin");
    useOrganizationStore.getState().setViewingOrgId("dealer-123");

    useOrganizationStore.getState().setViewingOrgId(null);

    expect(useOrganizationStore.getState().viewingOrgId).toBeNull();
  });
});
