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
  /** Accessible label for E2E testing and screen readers */
  "aria-label"?: string;
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
  "aria-label": ariaLabel,
}: SelectControlledProps) {
  // Case-insensitive lookup for robustness - handles VIN decode returning "Chevrolet"
  // when options have "chevrolet" as the key
  const selectedOption = options.find((opt) => opt.value.toLowerCase() === value.toLowerCase());
  const displayValue = selectedOption?.label ?? (value ? value : "");

  // Normalize the value to match the option's actual value (case-sensitive)
  // This ensures Radix Select's case-sensitive comparison works correctly
  const normalizedValue = selectedOption?.value ?? (value || "");

  /**
   * Guard against spurious empty-value resets from Radix BubbleInput.
   *
   * In environments where the @radix-ui/react-select patch is not applied
   * (e.g. Docker containers with unpatched node_modules), the hidden
   * BubbleInput fires onValueChange("") immediately after mounting because
   * the native <select> doesn't yet have options registered. Without the
   * patch condition `(isFormControl && nativeOptionsSet.size > 0)`, this
   * reset fires and clears a programmatically-set value (e.g. after VIN
   * decode via setValue()).
   *
   * Fix: ignore onValueChange("") calls when we currently have a value.
   * This is safe because SelectControlled has no "clear" option in the
   * trigger — intentional clearing only happens via onChange("") from
   * parent code, not from user interaction through the Radix trigger.
   */
  const handleChange = (val: string) => {
    if (val === "" && normalizedValue !== "") return;
    onChange(val);
  };

  return (
    <Select value={normalizedValue} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
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
  return fbOptions.map((opt) => ({ value: opt.key, label: opt[locale] }));
}
