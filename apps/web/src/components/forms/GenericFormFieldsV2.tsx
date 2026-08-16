/**
 * GenericFormFieldsV2 - Versión mejorada que combina:
 * - ✅ Schema-driven rendering (TU ventaja)
 * - ✅ Field groups con ordering (TU ventaja)
 * - ✅ Consistencia visual (shadcn/ui UX)
 * - ✅ Design tokens centralizados (ProSell theme)
 *
 * MIGRACIÓN: Reemplaza GenericFormFields.tsx con este archivo.
 */
"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFieldWrapper, getFieldId } from "./FormFieldWrapper";
import { SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import type { AttributeGroup, AttributeSchemaEntry } from "@/types/category";

interface GenericFormFieldsV2Props {
  /** Nombre único del form (para IDs accesibles) */
  formName: string;
  /** Schema de atributos dinámico */
  schema: Record<string, AttributeSchemaEntry>;
  /** Grupos de fields con ordering */
  groups: AttributeGroup[];
  /** Valores actuales del form */
  values: Record<string, unknown>;
  /** Callback cuando cambia un field */
  onChange: (key: string, value: unknown) => void;
  /** Errores de validación (opcional) */
  errors?: Record<string, string>;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Render individual field input basado en tipo.
 * MANTIENE: Tu lógica de tipos dinámicos.
 * MEJORA: Usa FormFieldWrapper para consistencia.
 */
function DynamicFieldInput({
  formName,
  fieldKey,
  entry,
  value,
  onChange,
  error,
  disabled,
}: {
  formName: string;
  fieldKey: string;
  entry: AttributeSchemaEntry;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  error?: string;
  disabled?: boolean;
}) {
  const fieldId = getFieldId(formName, fieldKey);
  const label = entry.label ?? fieldKey;
  const description = entry.description; // Tu schema puede tener descriptions

  // Boolean type → Checkbox
  if (entry.type === "boolean") {
    return (
      <FormFieldWrapper
        id={fieldId}
        label={label}
        error={error}
        description={description}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id={fieldId}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(fieldKey, checked === true)}
            disabled={disabled}
          />
        </div>
      </FormFieldWrapper>
    );
  }

  // Select type → Dropdown
  if (entry.type === "select" && entry.options?.length) {
    return (
      <FormFieldWrapper
        id={fieldId}
        label={label}
        error={error}
        description={description}
        required={entry.required}
      >
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(fieldKey, v)}
          disabled={disabled}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder={`Seleccionar ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {entry.options.map((opt) => {
              const optStr = String(opt);
              return (
                <SelectItem key={optStr} value={optStr}>
                  {optStr}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </FormFieldWrapper>
    );
  }

  // Number type → Number input
  if (entry.type === "number") {
    return (
      <FormFieldWrapper
        id={fieldId}
        label={label}
        error={error}
        description={description}
        required={entry.required}
      >
        <Input
          id={fieldId}
          type="number"
          value={value != null ? String(value) : ""}
          onChange={(e) =>
            onChange(fieldKey, e.target.value ? Number(e.target.value) : "")
          }
          disabled={disabled}
          aria-invalid={!!error}
        />
      </FormFieldWrapper>
    );
  }

  // Default → Text input
  return (
    <FormFieldWrapper
      id={fieldId}
      label={label}
      error={error}
      description={description}
      required={entry.required}
    >
      <Input
        id={fieldId}
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
      />
    </FormFieldWrapper>
  );
}

/**
 * Main component - MANTIENE tu lógica de grouping y ordering.
 */
export function GenericFormFieldsV2({
  formName,
  schema,
  groups,
  values,
  onChange,
  errors = {},
  disabled = false,
}: GenericFormFieldsV2Props) {
  // MANTIENE: Tu lógica de sorting y grouping
  const sortedGroups = [...groups].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const groupKeys = new Set(sortedGroups.map((g) => g.key));

  const fieldsByGroup: Record<string, string[]> = { _ungrouped: [] };
  for (const group of sortedGroups) fieldsByGroup[group.key] = [];
  for (const [key, entry] of Object.entries(schema)) {
    const gk =
      entry.group && groupKeys.has(entry.group) ? entry.group : "_ungrouped";
    fieldsByGroup[gk].push(key);
  }

  function renderFields(keys: string[]) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {keys.map((key) => (
          <DynamicFieldInput
            key={key}
            formName={formName}
            fieldKey={key}
            entry={schema[key]}
            value={values[key]}
            onChange={onChange}
            error={errors[key]}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={SPACING.form.sectionGap}>
      {/* Grupos ordenados */}
      {sortedGroups.map((group) =>
        fieldsByGroup[group.key]?.length ? (
          <section key={group.key} className="space-y-4">
            <h2 className={TYPOGRAPHY.heading.h4}>{group.label}</h2>
            {renderFields(fieldsByGroup[group.key])}
          </section>
        ) : null,
      )}

      {/* Fields sin grupo */}
      {fieldsByGroup._ungrouped.length > 0 && (
        <section className="space-y-4">
          {renderFields(fieldsByGroup._ungrouped)}
        </section>
      )}
    </div>
  );
}
