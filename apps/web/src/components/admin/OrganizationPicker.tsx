"use client";

import { Building2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/lib/api/organizations";
import { useOrganizationStore } from "@/stores/organizationStore";

/**
 * Header control that lets an admin "view as" another organization's
 * organization (Subsystem D). Renders nothing for non-admins — the
 * backend re-enforces ORG_ADMIN_VIEW_ALL regardless, this is UI-only.
 */
export function OrganizationPicker() {
  const { isAdmin } = useAuth();
  const { data: organizations = [], isLoading } = useOrganizations();
  const viewingOrgId = useOrganizationStore((state) => state.viewingOrgId);
  const setViewingOrgId = useOrganizationStore(
    (state) => state.setViewingOrgId,
  );

  if (!isAdmin) {
    return null;
  }

  // Only organizations with published products are worth switching to (US1.2).
  const visibleOrganizations = organizations.filter(
    (organization) => (organization.product_count ?? 0) > 0,
  );

  const currentOrganization = visibleOrganizations.find(
    (organization) => organization.id === viewingOrgId,
  );
  const displayName =
    viewingOrgId === "ALL_ORGS"
      ? "Todas las organizaciones"
      : (currentOrganization?.name ?? "Mi organización");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={isLoading}
          aria-label={`Ver como organización. Actual: ${displayName}`}
        >
          <Building2 className="h-4 w-4" />
          <span className="hidden md:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setViewingOrgId(null)}
          className={viewingOrgId === null ? "bg-accent" : ""}
        >
          <Building2 className="mr-2 h-4 w-4" />
          <span>Mi organización</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setViewingOrgId("ALL_ORGS")}
          className={viewingOrgId === "ALL_ORGS" ? "bg-accent" : ""}
        >
          <Layers className="mr-2 h-4 w-4" />
          <span>Todas las organizaciones</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {visibleOrganizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            onClick={() => setViewingOrgId(organization.id)}
            className={viewingOrgId === organization.id ? "bg-accent" : ""}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span>{organization.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
