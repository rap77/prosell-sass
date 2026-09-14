/**
 * Mileage label/unit depends on the owning organization's country — the US
 * client's real data is already in miles, not km. No value conversion here:
 * the number is stored and shown exactly as entered, only the label/unit
 * suffix changes. `Organization.country` is free text (no fixed country
 * list in the org form), so match against common English/Spanish aliases
 * for the United States rather than a strict code.
 */

const US_ALIASES = new Set([
  "us",
  "usa",
  "u.s.",
  "u.s.a.",
  "united states",
  "united states of america",
  "estados unidos",
]);

export function getMileageFieldOverride(country?: string | null): {
  label: string;
  unit: string;
} {
  const normalized = country?.trim().toLowerCase();
  if (normalized && US_ALIASES.has(normalized)) {
    return { label: "Millaje", unit: "mi" };
  }
  return { label: "Kilometraje", unit: "km" };
}
