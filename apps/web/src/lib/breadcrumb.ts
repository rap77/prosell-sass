/**
 * breadcrumb.ts
 *
 * Helpers for the Header breadcrumb. The Header builds a trail from
 * `usePathname()` by splitting on `/` and capitalizing each segment, which
 * is wrong on routes like `/catalog/<uuid>/edit`:
 *
 *   - It leaks raw UUIDs into the UI.
 *   - It capitalizes English plurals (`Catalog`) instead of using the
 *     Spanish copy the rest of the app uses (`Catálogo`).
 *
 * This module provides a small label resolver:
 *
 *   - UUID-shaped segments become "Detalle".
 *   - Known plural noun segments get a fixed Spanish label.
 *   - Known action segments ("edit", "new", "create") get a Spanish verb.
 *   - Anything else falls back to capitalizing the first character.
 *
 * The full pathname is accepted (not used for now) so future rules can
 * disambiguate actions that follow a UUID vs. a noun, e.g. a hypothetical
 * "/leads/<uuid>/assign" page.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Spanish labels for known plural noun segments.
 *
 * Keep this in sync with the Sidebar copy so the breadcrumb matches the
 * navigation the user just clicked.
 */
const NOUN_LABELS: Record<string, string> = {
  catalog: "Catálogo",
  products: "Productos",
  settings: "Configuración",
  notifications: "Notificaciones",
  security: "Seguridad",
  profile: "Perfil",
  dashboard: "Panel",
  leads: "Leads",
  appointments: "Turnos",
  teams: "Equipos",
  branches: "Sucursales",
};

/** Spanish labels for known action segments (singular verb form). */
const ACTION_LABELS: Record<string, string> = {
  edit: "Editar",
  new: "Nuevo",
  create: "Crear",
};

/**
 * Resolve a breadcrumb label for a single path segment.
 *
 * @param segment The raw path segment (e.g. "catalog", "<uuid>", "edit").
 * @param _fullPath The complete pathname. Currently unused — kept on the
 *                  signature for future context-aware rules.
 */
export function formatBreadcrumbLabel(
  segment: string,
  _fullPath: string = "",
): string {
  if (UUID_REGEX.test(segment)) {
    return "Detalle";
  }

  const lower = segment.toLowerCase();

  if (ACTION_LABELS[lower]) {
    return ACTION_LABELS[lower];
  }

  if (NOUN_LABELS[lower]) {
    return NOUN_LABELS[lower];
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
