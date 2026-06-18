"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCatalogFilters } from "@/lib/hooks/useCatalogFilters";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AttributeSchemaEntry, FilterField } from "@/types/category";

interface FilterSidebarProps {
  /** The category's filter_fields contract. */
  fields?: FilterField[];
  /** The category's attribute_schema (source of `options` for `select` fields). */
  schema?: Record<string, AttributeSchemaEntry>;
  /**
   * Facet values from the backend (T8) for `select` fields without static
   * options. Empty by default — the catalog container wires this up in a
   * follow-up task once filter_fields are resolved per category.
   */
  facetValues?: Record<string, string[]>;
}

/**
 * Convert `snake_case` (or `camelCase`) attribute keys into a human-readable
 * label: `snake_case` → "Snake Case". Falls back to the raw key for edge
 * cases (e.g. empty string).
 */
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

export function FilterSidebar({
  fields = [],
  schema = {},
  facetValues = {},
}: FilterSidebarProps) {
  const { values, setFilter, setFilters, clearAll } = useCatalogFilters(fields);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      aria-label="Catalog filters"
      className={`border-r bg-background transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
        aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className={`p-4 ${isCollapsed ? "hidden" : "space-y-6"}`}>
        {fields.map((field) => {
          const label = field.label ?? humanize(field.key);
          const controlId = `filter-${field.key}`;

          if (field.filter_type === "range") {
            const min = values[`${field.key}_min`];
            const max = values[`${field.key}_max`];
            const minNum = min ? Number(min) : 0;
            const maxNum = max ? Number(max) : 100;
            return (
              <div key={field.key}>
                <h3 className="font-semibold mb-3 text-sm">{label}</h3>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[minNum, maxNum]}
                  onValueChange={([lo, hi]) => {
                    setFilters({
                      [`${field.key}_min`]: String(lo),
                      [`${field.key}_max`]: String(hi),
                    });
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{minNum}</span>
                  <span>{maxNum}</span>
                </div>
              </div>
            );
          }

          if (field.filter_type === "select") {
            const entry = schema[field.key];
            const options = entry?.options ?? facetValues[field.key] ?? [];
            const selected = readMulti(values[field.key] ?? "");
            return (
              <div key={field.key}>
                <h3 className="font-semibold mb-3 text-sm">{label}</h3>
                <div className="space-y-2">
                  {options.map((option) => {
                    const checked = selected.includes(option);
                    const inputId = `${controlId}-${option}`;
                    return (
                      <div
                        key={option}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          onCheckedChange={(next) => {
                            const updated = next
                              ? [...selected, option]
                              : selected.filter((v) => v !== option);
                            setFilter(field.key, updated);
                          }}
                        />
                        <Label
                          htmlFor={inputId}
                          className="text-sm font-normal"
                        >
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (field.filter_type === "text") {
            return (
              <div key={field.key}>
                <Label
                  htmlFor={controlId}
                  className="font-semibold mb-3 text-sm block"
                >
                  {label}
                </Label>
                <Input
                  id={controlId}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setFilter(field.key, e.target.value)}
                />
              </div>
            );
          }

          if (field.filter_type === "boolean") {
            const checked = values[field.key] === "true";
            return (
              <div
                key={field.key}
                className="flex items-center justify-between"
              >
                <Label htmlFor={controlId} className="text-sm font-normal">
                  {label}
                </Label>
                <Switch
                  id={controlId}
                  checked={checked}
                  onCheckedChange={(next) =>
                    setFilter(field.key, next ? "true" : "")
                  }
                />
              </div>
            );
          }

          // filter_type === "exact": single-select.
          const entry = schema[field.key];
          const options = entry?.options ?? facetValues[field.key] ?? [];
          return (
            <div key={field.key}>
              <Label
                htmlFor={controlId}
                className="font-semibold mb-3 text-sm block"
              >
                {label}
              </Label>
              <select
                id={controlId}
                value={values[field.key] ?? ""}
                onChange={(e) => setFilter(field.key, e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Any</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        <Button
          variant="outline"
          onClick={clearAll}
          className="w-full"
          size="sm"
        >
          Clear All Filters
        </Button>
      </div>
    </aside>
  );
}
