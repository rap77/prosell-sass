"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCatalogFilters } from "@/lib/hooks/useCatalogFilters";
import type { FilterField } from "@/types/category";

/** Convert `snake_case`/`camelCase` keys into a human-readable label. */
function humanize(key: string): string {
  const withSpaces = key.replace(/[_-]+/g, " ");
  const titled = withSpaces.replace(/([a-z])([A-Z])/g, "$1 $2");
  return titled
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Read a comma-separated URL param into an array (empty for missing/blank). */
function readMulti(value: string): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

interface Pill {
  pillKey: string;
  label: string;
  onRemove: () => void;
}

interface FilterPillsProps {
  /** The category's filter_fields contract. */
  fields?: FilterField[];
}

export function FilterPills({ fields = [] }: FilterPillsProps) {
  const { values, setFilter, setFilters, clearAll } =
    useCatalogFilters(fields);

  const pills: Pill[] = [];

  for (const field of fields) {
    const label = field.label ?? humanize(field.key);

    if (field.filter_type === "range") {
      const min = values[`${field.key}_min`];
      const max = values[`${field.key}_max`];
      if (!min && !max) continue;
      pills.push({
        pillKey: field.key,
        label: `${label}: ${min || "…"} - ${max || "…"}`,
        onRemove: () =>
          setFilters({ [`${field.key}_min`]: "", [`${field.key}_max`]: "" }),
      });
      continue;
    }

    if (field.filter_type === "select") {
      const selected = readMulti(values[field.key] ?? "");
      for (const value of selected) {
        pills.push({
          pillKey: `${field.key}-${value}`,
          label: `${label}: ${value}`,
          onRemove: () =>
            setFilter(
              field.key,
              selected.filter((v) => v !== value),
            ),
        });
      }
      continue;
    }

    const value = values[field.key];
    if (!value) continue;
    pills.push({
      pillKey: field.key,
      label: field.filter_type === "boolean" ? label : `${label}: ${value}`,
      onRemove: () => setFilter(field.key, ""),
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/20 flex-wrap">
      <span className="text-sm text-muted-foreground">
        Active filters ({pills.length}):
      </span>

      <div className="flex flex-wrap gap-2">
        {pills.map((pill) => (
          <Button
            key={pill.pillKey}
            variant="secondary"
            size="sm"
            onClick={pill.onRemove}
            className="h-7 px-2 text-xs"
          >
            {pill.label}
            <X className="w-3 h-3 ml-1" />
          </Button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={clearAll}
        className="ml-auto h-7 text-xs"
      >
        Clear all
      </Button>
    </div>
  );
}
