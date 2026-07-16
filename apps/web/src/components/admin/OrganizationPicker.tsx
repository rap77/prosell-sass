"use client";

import { Building2 } from "lucide-react";
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

  const currentOrganization = organizations.find((d) => d.id === viewingOrgId);
  const displayName = currentOrganization?.name ?? "Todos los concesionarios";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={isLoading}
          aria-label={`Ver como concesionario. Actual: ${displayName}`}
        >
          <Building2 className="h-4 w-4" />
          <span className="hidden md:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Concesionarios</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setViewingOrgId(null)}
          className={viewingOrgId === null ? "bg-accent" : ""}
        >
          <Building2 className="mr-2 h-4 w-4" />
          <span>Todos los concesionarios</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {organizations.map((organization) => (
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
