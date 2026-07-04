"use client";

import { ChevronRight } from "lucide-react";
import { type Control, type UseFormSetValue, useWatch } from "react-hook-form";

import type { AttributeGroup, AttributeSchemaEntry } from "@/types/category";

import { SchemaFieldRenderer } from "./SchemaFieldRenderer";

interface SchemaFormSectionProps {
  group: AttributeGroup;
  fieldKeys: string[];
  schema: Record<string, AttributeSchemaEntry>;
  control: Control<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  disabled?: boolean;
  /** Start expanded (default: true for first 3 groups) */
  defaultOpen?: boolean;
}

/** Check if a value is considered "filled" */
function isFilled(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && isNaN(value)) return false;
  return true;
}

/**
 * Renders a collapsible form section with a heading and 2-column grid of fields.
 * Uses native <details> for zero-dependency accordion behavior.
 */
export function SchemaFormSection({
  group,
  fieldKeys,
  schema,
  control,
  setValue,
  disabled,
  defaultOpen = true,
}: SchemaFormSectionProps) {
  // Watch all fields in this group to count filled vs empty
  const values = useWatch({ control, name: fieldKeys });
  const filledCount = fieldKeys.filter((_, i) => isFilled(values?.[i])).length;

  if (fieldKeys.length === 0) return null;

  return (
    <details open={defaultOpen} className="group border rounded-lg">
      <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold select-none list-none">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        {group.label}
        <span className="ml-auto text-sm font-normal text-muted-foreground">
          {filledCount}/{fieldKeys.length}
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-2">
        {fieldKeys.map((key) => (
          <SchemaFieldRenderer
            key={key}
            fieldKey={key}
            entry={schema[key]}
            control={control}
            setValue={setValue}
            schema={schema}
            disabled={disabled}
          />
        ))}
      </div>
    </details>
  );
}

/**
 * Groups schema fields by their group key.
 * Returns a map of group key -> field keys, plus an "_ungrouped" bucket.
 */
export function groupFieldsByGroup(
  schema: Record<string, AttributeSchemaEntry>,
  groups: AttributeGroup[],
): Record<string, string[]> {
  const groupKeys = new Set(groups.map((g) => g.key));
  const result: Record<string, string[]> = { _ungrouped: [] };

  for (const group of groups) {
    result[group.key] = [];
  }

  for (const [key, entry] of Object.entries(schema)) {
    const gk =
      entry.group && groupKeys.has(entry.group) ? entry.group : "_ungrouped";
    result[gk].push(key);
  }

  return result;
}
