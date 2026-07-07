"use client";

import {
  Controller,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { DecodedVehicle } from "@/lib/api/vehicles";
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
  const label = entry.label ?? humanize(fieldKey);
  const inputId = `field-${fieldKey}`;

  // VIN decode field
  if (entry.render_as === "vin_decode") {
    return (
      <Controller
        name={fieldKey}
        control={control}
        render={({ field }) => (
          <VinDecodeField
            value={String(field.value ?? "")}
            onChange={field.onChange}
            onDecode={(decoded: DecodedVehicle) =>
              mapDecodedToForm(decoded, schema, setValue)
            }
            disabled={disabled}
            setValue={setValue}
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

  // Select with options
  // ponytail: check options array, not type — schema uses filter_type for select
  const options = entry.options;
  if (options && options.length > 0) {
    // ponytail: for number fields, convert string value back to number on change
    const isNumeric = entry.type === "number";
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
          const displayOptions =
            hasCurrentValue || !currentValue
              ? options
              : [field.value, ...options];

          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId}>
                {label}
                {entry.required && <span className="text-destructive"> *</span>}
              </Label>
              <Select
                value={currentValue}
                onValueChange={(v) => field.onChange(isNumeric ? Number(v) : v)}
                disabled={disabled}
              >
                <SelectTrigger id={inputId}>
                  {/* ponytail: render value manually — SelectValue loses ref when SelectContent unmounts */}
                  {currentValue ? (
                    <span>{currentValue}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select {label}
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {displayOptions.map((opt) => (
                    <SelectItem
                      key={String(opt)}
                      value={String(opt)}
                      textValue={String(opt)}
                    >
                      {String(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            onChange={field.onChange}
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
