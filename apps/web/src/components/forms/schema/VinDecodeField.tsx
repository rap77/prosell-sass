"use client";

import { Loader2 } from "lucide-react";
import { useCallback } from "react";
import type { UseFormSetValue } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDecodeVin, type DecodedVehicle } from "@/lib/api/vehicles";
import type { AttributeSchemaEntry } from "@/types/category";

interface VinDecodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  onDecode: (decoded: DecodedVehicle) => void;
  disabled?: boolean;
  /** Used to auto-fill stock_number from last 6 chars of VIN */
  setValue?: UseFormSetValue<Record<string, unknown>>;
}

/**
 * VIN input field with decode button.
 *
 * - Validates 17-char alphanumeric (no I, O, Q)
 * - Uppercase on input
 * - Decode button calls backend NHTSA service
 * - onDecode callback for parent to map decoded fields
 */
export function VinDecodeField({
  value,
  onChange,
  onDecode,
  disabled,
  setValue,
}: VinDecodeFieldProps) {
  const { mutate: decodeVin, isPending } = useDecodeVin();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Uppercase, strip invalid chars (I, O, Q)
      const cleaned = e.target.value
        .toUpperCase()
        .replace(/[IOQ]/g, "")
        .slice(0, 17);
      onChange(cleaned);
    },
    [onChange],
  );

  const handleDecode = useCallback(() => {
    if (value.length !== 17) return;

    decodeVin(value, {
      onSuccess: (decoded) => {
        onDecode(decoded);
        // Auto-fill stock_number from last 6 chars
        if (setValue) {
          setValue("stock_number", value.slice(-6));
        }
      },
    });
  }, [value, decodeVin, onDecode, setValue]);

  const isValidLength = value.length === 17;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="vin">VIN</Label>
      <div className="flex gap-2">
        <Input
          id="vin"
          value={value}
          onChange={handleChange}
          disabled={disabled || isPending}
          placeholder="Enter 17-character VIN"
          maxLength={17}
          className="font-mono uppercase"
          aria-label="VIN"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleDecode}
          disabled={disabled || isPending || !isValidLength}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Decoding...
            </>
          ) : (
            "Decode"
          )}
        </Button>
      </div>
      {value.length > 0 && !isValidLength && (
        <p className="text-sm text-muted-foreground">
          {17 - value.length} characters remaining
        </p>
      )}
    </div>
  );
}

/**
 * Maps decoded vehicle data to form fields using attribute_schema's vin_decode_key.
 *
 * @param decoded - The decoded vehicle from NHTSA
 * @param schema - The category's attribute_schema
 * @param setValue - React Hook Form's setValue
 */
export function mapDecodedToForm(
  decoded: DecodedVehicle,
  schema: Record<string, AttributeSchemaEntry>,
  setValue: UseFormSetValue<Record<string, unknown>>,
): void {
  for (const [key, entry] of Object.entries(schema)) {
    const decodeKey = entry.vin_decode_key;
    if (!decodeKey) continue;

    const value = decoded[decodeKey as keyof DecodedVehicle];
    if (value !== undefined && value !== null) {
      setValue(key, value);
    }
  }
}
