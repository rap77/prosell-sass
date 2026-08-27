/**
 * Normalize free-text vehicle form values to Title Case (FR6.1).
 *
 * Only applied to free-text attribute fields (make, model, trim, color…) —
 * never to Select/enum-backed fields, whose stored value must keep matching
 * their `options` list and Facebook Marketplace's controlled vocabulary
 * (see nhtsa_normalizer.py). Capitalizes the first letter after the start
 * of the string, whitespace, or a hyphen, so "mercedes-benz" → "Mercedes-Benz".
 */
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s-])([a-zà-öø-ÿ])/g,
      (_match, sep: string, char: string) => sep + char.toUpperCase(),
    );
}
