"use client";

import { Check, X } from "lucide-react";
import { useOrganizations } from "@/lib/api/organizations";
import type { RoleScope, ScopeType } from "@/lib/api/schemas/roles";
import { SCOPE_LABEL } from "./constants";

interface ScopeEditorTabProps {
  scope: RoleScope;
  onChange: (scope: RoleScope) => void;
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  own: "Cada usuario con este perfil ve solo los datos de su propia organización.",
  explicit:
    "Elegí qué organizaciones puede ver — solo entre las que vos mismo podés ver.",
  all: "Ve los datos de todas las organizaciones de la plataforma.",
};

const SELECTABLE_SCOPE_TYPES: Exclude<ScopeType, "none">[] = [
  "own",
  "explicit",
  "all",
];

/** "Alcance" tab — the data-visibility scope (own/explicit/all), plus
 * the organization checklist when explicit. Pure controlled component,
 * same pattern as GrantsMatrixTab. Reuses `useOrganizations()` (already
 * fetched for the admin org picker elsewhere) rather than a new
 * endpoint — no pre-disabling by the actor's own scope for the same
 * reason documented in GrantsMatrixTab (no "whoami" endpoint yet). */
export function ScopeEditorTab({ scope, onChange }: ScopeEditorTabProps) {
  const { data: organizations = [] } = useOrganizations();

  const toggleOrg = (orgId: string) => {
    const organization_ids = scope.organization_ids.includes(orgId)
      ? scope.organization_ids.filter((id) => id !== orgId)
      : [...scope.organization_ids, orgId];
    onChange({ scope_type: "explicit", organization_ids });
  };

  return (
    <div className="rounded-lg border border-ps-border-subtle p-4">
      <div className="space-y-3">
        {SELECTABLE_SCOPE_TYPES.map((scopeType) => {
          const isSelected = scope.scope_type === scopeType;
          return (
            <label
              key={scopeType}
              className="flex items-start gap-3 rounded-md p-3"
              data-selected={isSelected}
            >
              <input
                type="radio"
                name="scope-type"
                checked={isSelected}
                onChange={() =>
                  onChange({ scope_type: scopeType, organization_ids: [] })
                }
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-ps-text-primary">
                  {SCOPE_LABEL[scopeType]}
                </div>
                <div className="text-xs text-ps-text-tertiary">
                  {SCOPE_DESCRIPTIONS[scopeType]}
                </div>

                {scopeType === "explicit" && isSelected && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {organizations.map((org) => {
                      const active = scope.organization_ids.includes(org.id);
                      return (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => toggleOrg(org.id)}
                          className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-ps-text-tertiary data-[active=true]:bg-ps-info-bg data-[active=true]:text-ps-cyan"
                          data-active={active}
                        >
                          {active ? (
                            <Check className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <X className="h-3 w-3" aria-hidden="true" />
                          )}
                          {org.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
