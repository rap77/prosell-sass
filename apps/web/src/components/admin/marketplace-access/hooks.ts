/**
 * Custom hooks for marketplace access manager.
 * Extracts filtering and search logic for reusability.
 */
import type { MarketplaceAccessGrant } from "@/lib/api/schemas/marketplace-access";
import type { Organization } from "@/lib/api/schemas/organizations";

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "active", label: "Activos" },
  { value: "rejected", label: "Rechazados" },
  { value: "revoked", label: "Revocados" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["value"];

function isStatusTab(v: string): v is StatusTab {
  return STATUS_TABS.some((t) => t.value === v);
}

export function useFilteredGrants(
  grants: MarketplaceAccessGrant[],
  organizations: Organization[],
  activeTab: StatusTab,
  searchQuery: string,
) {
  // Organization name lookup
  const getOrgName = (id: string) =>
    organizations.find((o) => o.id === id)?.name || id.slice(0, 8);

  // Filtered grants with status and search — React Compiler handles memoization
  const filteredGrants = (() => {
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
  })();

  // Count by status for tab badges — React Compiler handles memoization
  const statusCounts = (() => ({
    all: grants.length,
    pending: grants.filter((g) => g.status === "pending").length,
    active: grants.filter((g) => g.status === "active").length,
    rejected: grants.filter((g) => g.status === "rejected").length,
    revoked: grants.filter((g) => g.status === "revoked").length,
  }))();

  return { filteredGrants, getOrgName, statusCounts };
}
