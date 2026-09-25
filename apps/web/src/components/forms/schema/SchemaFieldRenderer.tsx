"use client";

import { Info } from "lucide-react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectControlled } from "@/components/ui/select-controlled";
import {
  useVehicleModelsForMake,
  type DecodedVehicle,
} from "@/lib/api/vehicles";
import { tLabel } from "@/lib/translations/vehicle-values";
import { toTitleCase } from "@/lib/utils/toTitleCase";
import type { AttributeSchemaEntry } from "@/types/category";

import { mapDecodedToForm, VinDecodeField } from "./VinDecodeField";

interface SchemaFieldRendererProps {
  fieldKey: string;
  entry: AttributeSchemaEntry;
  control: Control<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  schema: Record<string, AttributeSchemaEntry>;
  disabled?: boolean;
}

/**
 * Renders a single form field based on its schema entry.
 *
 * Dispatches to appropriate input type:
 * - render_as: "vin_decode" → VinDecodeField
 * - type: "select" → Select dropdown
 * - type: "boolean" → Checkbox
 * - type: "number" → Number input
 * - default → Text input
 */
export function SchemaFieldRenderer({
  fieldKey,
  entry,
  control,
  setValue,
  schema,
  disabled,
}: SchemaFieldRendererProps) {
  // FR7.1: prefer a schema-provided label, then the Spanish field-name
  // dictionary (vehicle-values.ts — existed but was never wired into any
  // form renderer, which was the actual root cause of English labels like
  // "make"/"trim"/"mileage" mixed into an otherwise-Spanish form), and
  // fall back to a humanized key for categories outside that dictionary.
  const translatedLabel = tLabel(fieldKey);
  const label =
    entry.label ??
    (translatedLabel !== fieldKey ? translatedLabel : humanize(fieldKey));
  const inputId = `field-${fieldKey}`;

  // u2-vehicle-catalog-ui (AC1.1.2): read the RHF virtual channel the
  // `vin_decode` block writes via `mapDecodedToForm`'s `setValue`. Called
  // unconditionally (rules-of-hooks) even though only the `select` branch
  // below consumes it — every other branch just ignores the value.
  const watchedUnmatched = useWatch({ control, name: "_unmatchedFields" });

  // Dependent select (e.g. model depends_on make): watch the field named
  // in `depends_on` unconditionally (rules-of-hooks) — falls back to
  // watching this field's own key when `depends_on` isn't set, which is
  // harmless (same field the Controller below already registers).
  const dependsOnValue = useWatch({
    control,
    name: entry.depends_on ?? fieldKey,
  });
  const isNhtsaModelsField = entry.options_source === "nhtsa_models";
  const dependsOnFieldValue = isNhtsaModelsField
    ? String(dependsOnValue ?? "").trim()
    : undefined;
  const dependentModelsQuery = useVehicleModelsForMake(dependsOnFieldValue);

  // VIN decode field
  if (entry.render_as === "vin_decode") {
    return (
      <Controller
        name={fieldKey}
        control={control}
        render={({ field, fieldState }) => (
          <VinDecodeField
            value={String(field.value ?? "")}
            onChange={field.onChange}
            onDecode={(decoded: DecodedVehicle, unmatchedFields: string[]) =>
              mapDecodedToForm(decoded, schema, setValue, unmatchedFields)
            }
            disabled={disabled}
            setValue={setValue}
            required={entry.required}
            error={fieldState.error?.message}
          />
        )}
      />
    );
  }

  // Boolean (checkbox)
  if (entry.type === "boolean") {
    return (
      <Controller
        name={fieldKey}
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id={inputId}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
            <Label htmlFor={inputId} className="cursor-pointer">
              {label}
            </Label>
          </div>
        )}
      />
    );
  }

  // Dependent select whose options come from an API call keyed by another
  // field's value (today: model depends_on make, via NHTSA's model
  // catalog) instead of a static curated `options` list.
  if (isNhtsaModelsField) {
    const makeSelected = Boolean(dependsOnFieldValue);
    const dependsOnLabel = entry.depends_on
      ? tLabel(entry.depends_on) !== entry.depends_on
        ? tLabel(entry.depends_on)
        : humanize(entry.depends_on)
      : "la marca";
    const models = dependentModelsQuery.data ?? [];

    return (
      <Controller
        name={fieldKey}
        control={control}
        render={({ field, fieldState }) => {
          const currentValue = String(field.value ?? "");
          const hasCurrentValue = models.some(
            (m) => m.toLowerCase() === currentValue.toLowerCase(),
          );
          // Keep an out-of-catalog current value (e.g. a VIN-decoded or
          // hand-typed model NHTSA doesn't list) selectable, same pattern
          // as the static-options branch below.
          const displayOptions = (
            hasCurrentValue || !currentValue
              ? models
              : [currentValue, ...models]
          ).map((m) => ({ value: m, label: m }));

          const placeholder = !makeSelected
            ? `Elegí ${dependsOnLabel} primero`
            : dependentModelsQuery.isLoading
              ? "Cargando modelos..."
              : `Seleccioná ${label}`;

          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId}>
                {label}
                {entry.required && <span className="text-destructive"> *</span>}
              </Label>
              <SelectControlled
                id={inputId}
                value={currentValue}
                onChange={field.onChange}
                options={displayOptions}
                placeholder={placeholder}
                disabled={
                  disabled || !makeSelected || dependentModelsQuery.isLoading
                }
                aria-label={label}
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          );
        }}
      />
    );
  }

  // Select with options
  // ponytail: check options array, not type — schema uses filter_type for select
  const options = entry.options;
  if (options && options.length > 0) {
    // ponytail: for number fields, convert string value back to number on change
    const isNumeric = entry.type === "number";
    // u2-vehicle-catalog-ui (AC1.1.2): this field's key is in the
    // "_unmatchedFields" channel written by the sibling vin_decode block
    // (frontend-components.md § 1) — the VIN decode found no canonical
    // option match for this field, so it was left for manual entry.
    const unmatched =
      Array.isArray(watchedUnmatched) && watchedUnmatched.includes(fieldKey);
    const helpTextId = `${inputId}-mismatch-help`;
    return (
      <Controller
        name={fieldKey}
        control={control}
        render={({ field, fieldState }) => {
          const currentValue = String(field.value ?? "");
          // ponytail: if VIN decode sets a value not in options, include it so Select shows it
          const optionStrings = options.map((o) => String(o));
          const hasCurrentValue =
            currentValue && optionStrings.includes(currentValue);
          const displayOptions = (
            hasCurrentValue || !currentValue
              ? options
              : [field.value, ...options]
          ).map((opt) => ({ value: String(opt), label: String(opt) }));

          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId}>
                {label}
                {entry.required && <span className="text-destructive"> *</span>}
              </Label>
              <div className="flex items-center gap-2">
                <SelectControlled
                  id={inputId}
                  value={currentValue}
                  onChange={(v) => field.onChange(isNumeric ? Number(v) : v)}
                  options={displayOptions}
                  placeholder={`Seleccioná ${label}`}
                  disabled={disabled}
                  aria-label={label}
                />
                {/* AC1.1.2: help icon shown only when the VIN decode could
                    not match a canonical option for this field. Focusable
                    (Tab) per interaction-spec.md — native <button> with
                    title gives a hover/focus tooltip; the visible text
                    below is what a screen reader actually announces. */}
                {unmatched && (
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    title="No se pudo autocompletar — completar a mano"
                    aria-label={`${label}: no se pudo autocompletar — completar a mano`}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
              </div>
              {unmatched && (
                <p id={helpTextId} className="text-sm text-muted-foreground">
                  No se pudo autocompletar — completar a mano
                </p>
              )}
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          );
        }}
      />
    );
  }

  // Number
  if (entry.type === "number") {
    return (
      <Controller
        name={fieldKey}
        control={control}
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor={inputId}>
              {label}
              {entry.unit && ` (${entry.unit})`}
              {entry.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={inputId}
              type="number"
              step="any"
              value={field.value != null ? String(field.value) : ""}
              onChange={(e) =>
                field.onChange(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              disabled={disabled}
              min={entry.validation_rules?.min}
              max={entry.validation_rules?.max}
            />
            {fieldState.error && (
              <p className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />
    );
  }

  // Default: string input
  // FR6.1: Title Case free-text fields on every change — VIN-decoded values
  // are normalized in mapDecodedToForm(); this covers manual typing too.
  return (
    <Controller
      name={fieldKey}
      control={control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>
            {label}
            {entry.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={inputId}
            type="text"
            value={String(field.value ?? "")}
            onChange={(e) => field.onChange(toTitleCase(e.target.value))}
            disabled={disabled}
          />
          {fieldState.error && (
            <p className="text-sm text-destructive">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}

/** Convert snake_case to Title Case */
function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
