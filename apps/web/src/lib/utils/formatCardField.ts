import type { CardField, AttributeSchemaEntry } from "@/types/category";

/** Small known-label dictionary. Extend as needed; falls back to humanized key. */
const KNOWN_LABELS: Record<string, string> = {
  mileage: "Kilometraje",
  year: "Año",
  area_m2: "Superficie",
  bedrooms: "Dormitorios",
  bathrooms: "Baños",
  fuel_type: "Combustible",
  transmission: "Transmisión",
  color: "Color",
  make: "Marca",
  model: "Modelo",
};

/** Humanize a snake_case key: `engine_size` → `Engine Size`. */
function humanizeKey(key: string): string {
  return key
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

/** Result of formatting a single card_field cell. */
export interface FormattedCardField {
  key: string;
  label: string;
  value: string | null;
}

/**
 * Format a single `card_field` cell: humanized label + value formatted by the
 * attribute's `type` and `unit`. Returns `value: null` when the value is
 * missing (caller skips the cell — see Subsystem A spec §8).
 *
 * @param field   The card_field declaration (key + source path).
 * @param value   The raw attribute value (may be undefined).
 * @param schema  The category's `attribute_schema` (key → entry).
 */
export function formatCardField(
  field: CardField,
  value: unknown,
  schema: Record<string, AttributeSchemaEntry>,
): FormattedCardField {
  // Normalize: backend may send string shortcuts (e.g. "make") or objects ({ key, source })
  const normalized =
    typeof field === "string"
      ? { key: field, source: `attributes.${field}` }
      : field;

  const entry = schema[normalized.key];
  const label =
    entry?.label ?? KNOWN_LABELS[normalized.key] ?? humanizeKey(normalized.key);

  if (value === undefined || value === null) {
    return { key: normalized.key, label, value: null };
  }

  let formatted: string;
  if (entry?.type === "number" && typeof value === "number") {
    // Group thousands only when there's a unit (mileage/area benefit from it);
    // unit-less numbers like `year` (2020) render as "2020", not "2.020".
    const useGrouping = Boolean(entry.unit);
    formatted = new Intl.NumberFormat("es-AR", { useGrouping }).format(value);
    if (entry.unit) formatted = `${formatted} ${entry.unit}`;
  } else if (typeof value === "boolean") {
    formatted = value ? "Sí" : "No";
  } else {
    formatted = String(value);
  }

  return { key: normalized.key, label, value: formatted };
}
