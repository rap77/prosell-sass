"use client";

import { Controller, type Control, type UseFormSetValue } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  const options = entry.options;
  if (entry.type === "select" && options && options.length > 0) {
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
            <Select
              value={String(field.value ?? "")}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger id={inputId}>
                <SelectValue placeholder={`Select ${label}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error && (
              <p className="text-sm text-destructive">{fieldState.error.message}</p>
            )}
          </div>
        )}
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
              value={field.value != null ? String(field.value) : ""}
              onChange={(e) =>
                field.onChange(e.target.value ? Number(e.target.value) : undefined)
              }
              disabled={disabled}
              min={entry.validation_rules?.min}
              max={entry.validation_rules?.max}
            />
            {fieldState.error && (
              <p className="text-sm text-destructive">{fieldState.error.message}</p>
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
            <p className="text-sm text-destructive">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}

/** Convert snake_case to Title Case */
function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
