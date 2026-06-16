/**
 * Client-side subtitle composition for the ProductCard (Subsystem A).
 *
 * Mirrors the server-side `compose_from_template` contract used for `title`
 * (Foundation) but is applied here on the client:
 *   - Literal-only `{field}` substitution (no expressions, no nesting).
 *   - Unknown placeholders are dropped silently (no crash, no raw `{key}` in output).
 *   - Missing attributes (key absent or value is `undefined` / `null`) cause the
 *     entire `{field}` token to be removed — adjacent separators are collapsed
 *     to avoid "a · · b" patterns.
 *   - Literals between placeholders are preserved verbatim.
 *   - Non-string values are coerced via `String(value)`.
 *
 * Spec: docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md §7
 * Decision (deviation from Foundation §4): see
 *   engram obs #1816 (subtitle composed client-side in Subsystem A).
 */
const PLACEHOLDER = /\{([^}]+)\}/g;

export function composeSubtitle(
  template: string | null,
  attributes: Record<string, unknown>,
): string {
  if (!template) return "";

  return template
    .replace(PLACEHOLDER, (match, key: string) => {
      const value = attributes[key];
      if (value === undefined || value === null) {
        // Drop the placeholder only. We don't try to remove the preceding
        // separator in-place from inside `replace`; instead we collapse
        // runs of " · " in a post-pass below. Leading/trailing literals
        // (including spaces) are preserved verbatim — see test 5.
        return "";
      }
      return String(value);
    })
    // Collapse " · · " → " · " (and similar) for separators commonly used in
    // the catalog. This is intentionally narrow; we don't try to handle every
    // possible separator template. The `^ · | · $` pattern trims the
    // separator only at the edges, NOT generic whitespace.
    .replace(/( · )+/g, " · ")
    .replace(/^ · | · $/g, "");
}
