"use client";

import type { Control, UseFormSetValue } from "react-hook-form";

import type { AttributeGroup, AttributeSchemaEntry } from "@/types/category";

import { SchemaFieldRenderer } from "./SchemaFieldRenderer";

interface SchemaFormSectionProps {
  group: AttributeGroup;
  fieldKeys: string[];
  schema: Record<string, AttributeSchemaEntry>;
  control: Control<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  disabled?: boolean;
}

/**
 * Renders a form section with a heading and 2-column grid of fields.
 */
export function SchemaFormSection({
  group,
  fieldKeys,
  schema,
  control,
  setValue,
  disabled,
}: SchemaFormSectionProps) {
  if (fieldKeys.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-base font-semibold border-b pb-2">{group.label}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
    </section>
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
