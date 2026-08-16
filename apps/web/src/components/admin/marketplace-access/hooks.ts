/**
 * Custom hooks for marketplace access manager.
 * Extracts filtering and search logic for reusability.
 */
import { useMemo } from "react";
import type { MarketplaceAccessGrant } from "@/lib/api/schemas/marketplace-access";
import type { Organization } from "@/lib/api/schemas/organizations";

type StatusTab = "all" | "pending" | "active" | "rejected" | "revoked";

export function useFilteredGrants(
  grants: MarketplaceAccessGrant[],
  organizations: Organization[],
  activeTab: StatusTab,
  searchQuery: string,
) {
  // Organization name lookup
  const getOrgName = (id: string) =>
    organizations.find((o) => o.id === id)?.name || id.slice(0, 8);

  // Filtered grants with status and search
  const filteredGrants = useMemo(() => {
    let result = grants;

    // Status filter
    if (activeTab !== "all") {
      result = result.filter((g) => g.status === activeTab);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          getOrgName(g.inventory_owner_organization_id)
            .toLowerCase()
            .includes(query) ||
          getOrgName(g.operator_organization_id).toLowerCase().includes(query),
      );
    }

    return result;
  }, [grants, activeTab, searchQuery, organizations]);

  // Count by status for tab badges
  const statusCounts = useMemo(() => {
    return {
      all: grants.length,
      pending: grants.filter((g) => g.status === "pending").length,
      active: grants.filter((g) => g.status === "active").length,
      rejected: grants.filter((g) => g.status === "rejected").length,
      revoked: grants.filter((g) => g.status === "revoked").length,
    };
  }, [grants]);

  return { filteredGrants, getOrgName, statusCounts };
}
