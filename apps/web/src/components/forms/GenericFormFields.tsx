"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AttributeGroup, AttributeSchemaEntry } from "@/types/category";

interface GenericFormFieldsProps {
  schema: Record<string, AttributeSchemaEntry>;
  groups: AttributeGroup[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled: boolean;
}

function FieldInput({
  fieldKey,
  entry,
  value,
  onChange,
  disabled,
}: {
  fieldKey: string;
  entry: AttributeSchemaEntry;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  disabled: boolean;
}) {
  const label = entry.label ?? fieldKey;
  const inputId = `dyn-${fieldKey}`;

  if (entry.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={inputId}
          checked={Boolean(value)}
          onChange={(e) => onChange(fieldKey, e.target.checked)}
          disabled={disabled}
          aria-label={label}
        />
        <Label htmlFor={inputId}>{label}</Label>
      </div>
    );
  }

  if (entry.type === "select" && entry.options?.length) {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(fieldKey, v)}
          disabled={disabled}
        >
          <SelectTrigger id={inputId}>
            <SelectValue placeholder={`Seleccionar ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {entry.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (entry.type === "number") {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        <Input
          id={inputId}
          type="number"
          value={value != null ? String(value) : ""}
          onChange={(e) =>
            onChange(fieldKey, e.target.value ? Number(e.target.value) : "")
          }
          disabled={disabled}
          aria-label={label}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

export function GenericFormFields({
  schema,
  groups,
  values,
  onChange,
  disabled,
}: GenericFormFieldsProps) {
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  const groupKeys = new Set(sortedGroups.map((g) => g.key));

  const fieldsByGroup: Record<string, string[]> = { _ungrouped: [] };
  for (const group of sortedGroups) fieldsByGroup[group.key] = [];
  for (const [key, entry] of Object.entries(schema)) {
    const gk = entry.group && groupKeys.has(entry.group) ? entry.group : "_ungrouped";
    fieldsByGroup[gk].push(key);
  }

  function renderFields(keys: string[]) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {keys.map((key) => (
          <FieldInput
            key={key}
            fieldKey={key}
            entry={schema[key]}
            value={values[key]}
            onChange={onChange}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sortedGroups.map((group) =>
        fieldsByGroup[group.key]?.length ? (
          <section key={group.key} className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">{group.label}</h2>
            {renderFields(fieldsByGroup[group.key])}
          </section>
        ) : null,
      )}
      {fieldsByGroup._ungrouped.length > 0 && (
        <section className="flex flex-col gap-4">
          {renderFields(fieldsByGroup._ungrouped)}
        </section>
      )}
    </div>
  );
}
