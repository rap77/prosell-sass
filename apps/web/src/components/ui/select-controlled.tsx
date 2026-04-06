/**
 * Select component wrapper with controlled value display.
 *
 * React Hook Form's Select + Radix UI + React 19 has a known issue where
 * SelectValue doesn't display the selected item's label when value is set
 * programmatically (e.g., after VIN decode).
 *
 * This component solves it by looking up the display label from options
 * and rendering it explicitly.
 *
 * @see https://github.com/radix-ui/primitives/issues/3381
 */

"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

export interface SelectOption {
  /** The canonical value stored in form state */
  value: string;
  /** The display text shown to user */
  label: string;
}

interface SelectControlledProps {
  /** The form value (empty string "" means no selection) */
  value: string;
  /** Called with the selected value, or "" when cleared */
  onChange: (value: string) => void;
  /** Options for the select */
  options: SelectOption[];
  /** Placeholder text when nothing is selected */
  placeholder: string;
  /** Unique ID for the trigger */
  id?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Additional classNames for the trigger */
  className?: string;
}

/**
 * Select component with explicit label lookup.
 *
 * Unlike standard Radix Select (which infers label from DOM), this passes
 * the label directly so it updates correctly with programmatic value changes.
 */
export function SelectControlled({
  value,
  onChange,
  options,
  placeholder,
  id,
  disabled,
  className,
}: SelectControlledProps) {
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label ?? (value ? value : "");

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
        {/*
          Passing display value as children ensures it renders when set
          programmatically, bypassing Radix's internal DOM lookup.
        */}
        {displayValue || (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Hook to convert FbOption[] to SelectOption[] format.
 *
 * @param fbOptions Array of { key, es, en } objects from fbVehicleOptions
 * @param locale "es" or "en" — defaults to "es"
 */
export function useFbOptions(
  fbOptions: Array<{ key: string; es: string; en: string }>,
  locale: "es" | "en" = "es",
): SelectOption[] {
  return React.useMemo(
    () => fbOptions.map((opt) => ({ value: opt.key, label: opt[locale] })),
    [fbOptions, locale],
  );
}
