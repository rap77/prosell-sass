"use client";

import { useState } from "react";
import { Search, ShieldCheck, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/api/schemas/roles";
import { SCOPE_LABEL } from "./constants";

interface RolesListPanelProps {
  roles: Role[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Left column of the admin profiles screen (bloque 3): search + list of
 * permission profiles, each tagged as a system template or a custom
 * profile and its current data-visibility scope. Purely presentational —
 * the parent owns the fetched `roles` and what "selected" means. */
export function RolesListPanel({
  roles,
  selectedId,
  onSelect,
}: RolesListPanelProps) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? roles.filter((role) => role.name.toLowerCase().includes(normalized))
    : roles;

  return (
    <aside className="w-[320px] shrink-0">
      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ps-text-tertiary"
          aria-hidden="true"
        />
        <Input
          placeholder="Buscar perfil..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Buscar perfil"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ps-text-secondary">
          No se encontraron perfiles para &quot;{query}&quot;
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((role) => {
            const isSelected = role.id === selectedId;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => onSelect(role.id)}
                aria-current={isSelected}
                data-testid={`role-card-${role.id}`}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  isSelected
                    ? "border-ps-border-active bg-ps-bg-elevated"
                    : "border-ps-border-subtle bg-ps-bg-surface",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ps-text-primary">
                    {role.name}
                  </span>
                  {role.is_system_role ? (
                    <ShieldCheck
                      className="h-3.5 w-3.5 text-ps-cyan"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy
                      className="h-3.5 w-3.5 text-ps-warning"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      role.is_system_role
                        ? "bg-ps-info-bg text-ps-cyan"
                        : "bg-ps-warning-bg text-ps-warning",
                    )}
                  >
                    {role.is_system_role ? "Plantilla" : "Personalizado"}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-ps-text-secondary">
                    {SCOPE_LABEL[role.scope.scope_type]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
