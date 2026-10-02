"use client";

import { Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface OrganizationMultiSelectOption {
  id: string;
  name: string;
}

interface OrganizationMultiSelectFilterProps {
  organizations: OrganizationMultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Catalog-page-local multi-organization filter (checkboxes) — lets a
 * super_admin/admin with ORG_ADMIN_VIEW_ALL narrow the grid (and
 * whatever gets exported from it) to a SPECIFIC SET of organizations,
 * not just one or "todas". Deliberately separate from the header's
 * `OrganizationPicker` / `organizationStore.viewingOrgId` — that global
 * "view as" picker also drives the admin review-queue screen, which
 * this filter has no business touching. Selection is local to the
 * catalog page; it resets on navigation away, same as every other
 * catalog filter that isn't persisted in the URL.
 */
export function OrganizationMultiSelectFilter({
  organizations,
  selectedIds,
  onChange,
  disabled = false,
}: OrganizationMultiSelectFilterProps) {
  const selectedCount = selectedIds.length;
  const triggerLabel =
    selectedCount === 0
      ? "Organizaciones"
      : selectedCount === 1
        ? (organizations.find((org) => org.id === selectedIds[0])?.name ??
          "1 organización")
        : `${selectedCount} organizaciones`;

  function toggle(organizationId: string) {
    if (selectedIds.includes(organizationId)) {
      onChange(selectedIds.filter((id) => id !== organizationId));
    } else {
      onChange([...selectedIds, organizationId]);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={disabled}
          aria-label={`Filtrar por organizaciones. Actual: ${triggerLabel}`}
          data-testid="organization-multiselect-trigger"
        >
          <Building2 className="h-4 w-4" />
          <span>{triggerLabel}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Filtrar por organización</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {selectedCount > 0 && (
          <>
            <DropdownMenuCheckboxItem
              checked={false}
              onSelect={(e) => {
                e.preventDefault();
                onChange([]);
              }}
              data-testid="organization-multiselect-clear"
            >
              Limpiar selección
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        {organizations.map((organization) => (
          <DropdownMenuCheckboxItem
            key={organization.id}
            checked={selectedIds.includes(organization.id)}
            onSelect={(e) => {
              // Keep the menu open across multiple picks — the default
              // Radix behavior closes it after any single selection,
              // which defeats the point of a multi-select.
              e.preventDefault();
              toggle(organization.id);
            }}
            data-testid={`organization-multiselect-item-${organization.id}`}
          >
            {organization.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
