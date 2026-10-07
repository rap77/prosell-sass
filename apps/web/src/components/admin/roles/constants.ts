/**
 * Static UI metadata for the admin profiles screen (bloque 3) — mirrors the
 * real backend zone×action grant matrix (migration 20261006_0002), grouped
 * into UI sections per the mapping confirmed with the user (2026-10-07):
 * Catálogo←catalog, Marketplace←marketplace, Concesionarios←organizations,
 * Configuración←settings, Admin←users+roles+analytics.
 */

export type ZoneId =
  | "catalog"
  | "marketplace"
  | "organizations"
  | "settings"
  | "users"
  | "roles"
  | "analytics";

export interface ZoneDef {
  id: ZoneId;
  label: string;
  actions: { id: string; label: string }[];
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  catalog: {
    id: "catalog",
    label: "Catálogo",
    actions: [
      { id: "create", label: "Crear" },
      { id: "read", label: "Ver" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Eliminar" },
    ],
  },
  marketplace: {
    id: "marketplace",
    label: "Publicación Marketplace",
    actions: [{ id: "publish", label: "Publicar" }],
  },
  organizations: {
    id: "organizations",
    label: "Concesionarios",
    actions: [
      { id: "create", label: "Crear" },
      { id: "read", label: "Ver" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Eliminar" },
    ],
  },
  settings: {
    id: "settings",
    label: "Configuración",
    actions: [
      { id: "read", label: "Ver" },
      { id: "update", label: "Editar" },
    ],
  },
  users: {
    id: "users",
    label: "Usuarios",
    actions: [
      { id: "create", label: "Crear" },
      { id: "read", label: "Ver" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Eliminar" },
    ],
  },
  roles: {
    id: "roles",
    label: "Perfiles",
    actions: [
      { id: "create", label: "Crear" },
      { id: "read", label: "Ver" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Eliminar" },
    ],
  },
  analytics: {
    id: "analytics",
    label: "Analíticas",
    actions: [
      { id: "view", label: "Ver" },
      { id: "export", label: "Exportar" },
    ],
  },
};

export interface UiSection {
  id: string;
  label: string;
  zones: ZoneId[];
}

export const UI_SECTIONS: UiSection[] = [
  { id: "catalog", label: "Catálogo", zones: ["catalog"] },
  { id: "marketplace", label: "Marketplace", zones: ["marketplace"] },
  { id: "organizations", label: "Concesionarios", zones: ["organizations"] },
  { id: "settings", label: "Configuración", zones: ["settings"] },
  { id: "admin", label: "Admin", zones: ["users", "roles", "analytics"] },
];

export const SCOPE_LABEL: Record<string, string> = {
  own: "Propia organización",
  explicit: "Organizaciones específicas",
  all: "Todas las organizaciones",
  none: "Sin alcance configurado",
};
