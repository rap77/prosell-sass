"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { RoleGrant } from "@/lib/api/schemas/roles";
import { UI_SECTIONS, ZONES } from "./constants";

interface GrantsMatrixTabProps {
  grants: RoleGrant[];
  onChange: (grants: RoleGrant[]) => void;
}

/** "Permisos" tab — the zone×action grant matrix, grouped into UI
 * sections. Pure controlled component: toggling a checkbox reports the
 * new full `grants` array up via onChange, nothing is persisted here.
 *
 * No pre-disabling by the actor's own grants: the frontend has no
 * endpoint today exposing the caller's own effective grants/scope
 * (bloque 3 scope gap, documented in the workbook) — the real
 * anti-escalation guard still runs server-side on save and surfaces as
 * a 403 if the actor tries to grant more than they hold. */
export function GrantsMatrixTab({ grants, onChange }: GrantsMatrixTabProps) {
  const hasGrant = (zone: string, action: string) =>
    grants.some((g) => g.zone === zone && g.action === action);

  const toggle = (zone: string, action: string) => {
    if (hasGrant(zone, action)) {
      onChange(grants.filter((g) => !(g.zone === zone && g.action === action)));
    } else {
      onChange([...grants, { zone, action }]);
    }
  };

  return (
    <div className="space-y-4">
      {UI_SECTIONS.map((section) => (
        <div
          key={section.id}
          className="rounded-lg border border-ps-border-subtle p-4"
        >
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ps-text-secondary">
            {section.label}
          </h3>
          <div className="space-y-3">
            {section.zones.map((zoneId) => {
              const zone = ZONES[zoneId];
              return (
                <div key={zoneId} className="flex items-center gap-4">
                  <span className="w-32 shrink-0 text-sm text-ps-text-primary">
                    {zone.label}
                  </span>
                  <div className="flex flex-wrap gap-4">
                    {zone.actions.map((action) => {
                      const key = `${zoneId}:${action.id}`;
                      return (
                        <label
                          key={action.id}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <Checkbox
                            aria-label={key}
                            checked={hasGrant(zoneId, action.id)}
                            onCheckedChange={() => toggle(zoneId, action.id)}
                          />
                          {action.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
