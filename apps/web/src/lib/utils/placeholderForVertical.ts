/**
 * Map a vertical's root slug to its branded placeholder asset path.
 *
 * Spec §5:
 *   - vehiculos-y-transporte → vehicles
 *   - bienes-raices          → realstate
 *   - unknown                → neutral generic fallback
 *
 * The asset is a `.webp` (re-exported from the original 1.3MB PNG by
 * `scripts/optimize-placeholders.mjs` — see T8). Path is `/placeholders/...`
 * (served from `apps/web/public/`).
 */
const NICHE_MAP: Record<string, string> = {
  "vehiculos-y-transporte": "vehicles",
  "bienes-raices": "realstate",
  // Future niches: add here as the corresponding .webp is added.
};

const GENERIC = "/placeholders/placeholder-generic.webp";

export function placeholderForVertical(slug: string | null | undefined): string {
  if (!slug) return GENERIC;
  const niche = NICHE_MAP[slug];
  if (!niche) return GENERIC;
  return `/placeholders/placeholder-${niche}.webp`;
}
