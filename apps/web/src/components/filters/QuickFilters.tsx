/**
 * Shared presentational controls for the catalog's quick filters —
 * "Estado" dropdown and the tri-state toggle. Composed by
 * `CatalogFilterPanel` (the collapsible/staged panel used on both mobile
 * and desktop); neither component here talks to the URL directly — that's
 * the panel's job, since it owns the staged-vs-applied distinction.
 *
 * Non-component logic (status parsing, the applied-statuses hook) lives in
 * `catalogFilterLogic.ts` — kept out of this file so it only ever exports
 * components (react-doctor `only-export-components` / Fast Refresh).
 *
 * The toggle groups are explicit buttons (not `<select>`s) because the
 * third "Todos" state is a clearer reset action when it has its own
 * button than as a dropdown option.
 *
 * "Aprobado para Marketplace" labels the boolean filter on the
 * `published_to_marketplace` column — set by `Product.approve()` when a
 * pending product is approved at the prosel-sass level. The actual
 * publication to Facebook Marketplace is handled by the separate
 * `fb-autopost` desktop app (currently in development), which can push a
 * single approved product to multiple Facebook accounts. So the toggle
 * filters by *approval*, not by *live status*.
 */

"use client";

import type { VehicleStatus } from "@/components/datagrid/StatusBadge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type TriState } from "./catalogFilterLogic";
import { mapVehicleStatusToProductStatus } from "@/lib/utils/mapProductStatusToVehicleStatus";

interface TriStateToggleProps {
  label: string;
  value: TriState;
  onChange: (next: TriState) => void;
  testIdPrefix: string;
}

export function TriStateToggle({
  label,
  value,
  onChange,
  testIdPrefix,
}: TriStateToggleProps) {
  const options: { state: TriState; text: string }[] = [
    { state: "any", text: "Todos" },
    { state: "true", text: "Sí" },
    { state: "false", text: "No" },
  ];
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-9 items-stretch rounded-lg border border-ps-border-default bg-ps-input-bg overflow-hidden"
    >
      <span className="inline-flex items-center px-2.5 text-[12px] font-medium text-ps-text-secondary border-r border-ps-border-default">
        {label}
      </span>
      {options.map((option) => {
        const active = option.state === value;
        return (
          <button
            key={option.state}
            type="button"
            aria-pressed={active}
            data-testid={`${testIdPrefix}-${option.state}`}
            onClick={() => onChange(option.state)}
            className={cn(
              "px-2.5 text-[12px] font-medium cursor-pointer transition-colors border-0 border-r border-ps-border-default last:border-r-0",
              active
                ? "bg-ps-cyan text-ps-base"
                : "bg-transparent text-ps-text-primary hover:bg-ps-hover-bg-xs",
            )}
          >
            {option.text}
          </button>
        );
      })}
    </div>
  );
}

/** Controlled "Estado" dropdown — value is the raw `status` URL param shape. */
interface StatusSelectProps {
  value: string | null;
  onChange: (next: string) => void;
  options: VehicleStatus[];
  testId?: string;
}

export function StatusSelect({
  value,
  onChange,
  options,
  testId = "quick-filters-status-select",
}: StatusSelectProps) {
  return (
    <label className="inline-flex items-center gap-2 h-9 px-2.5 rounded-lg border border-ps-border-default bg-ps-input-bg">
      <span className="text-[12px] font-medium text-ps-text-secondary">
        Estado
      </span>
      <select
        aria-label="Estado del flujo"
        data-testid={testId}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        // `color-scheme: dark` tells the browser to render the native
        // dropdown options with a dark palette — without it the
        // open-options popup inherits the OS light theme and the text
        // is invisible against the project's dark background.
        className="bg-ps-input-bg text-[13px] text-ps-text-primary outline-none cursor-pointer"
        style={{ colorScheme: "dark" }}
      >
        <option value="">Todos</option>
        {options.map((status) => (
          <option key={status} value={mapVehicleStatusToProductStatus(status)}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  );
}
