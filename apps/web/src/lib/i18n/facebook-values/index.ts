/**
 * Facebook Marketplace official field values.
 *
 * Source of truth for the enum values Facebook accepts on its Marketplace
 * vehicle/property listings (extracted from the client's reference spreadsheet
 * `Base de Datos Pro Sell 33.xlsx`, sheet "Tabla 2"). These are the EXACT
 * strings the publisher sends to Facebook — wrong case, missing accents, or
 * underscore-vs-space mismatches all cause rejections at publish time.
 *
 * Users enter values ONCE in the platform (in their preferred locale). At
 * publish time, `getValueLabel(field, key, locale)` returns the string in the
 * locale matching the Facebook account's region:
 *
 *   - Spanish (`es`) — Latin America, Spain
 *   - English  (`en`) — US, UK, CA (translated; Facebook Marketplace accepts
 *                       English values for the same fields in those regions)
 *
 * The seed schema in `apps/api/src/prosell/infrastructure/database/seed_categories.py`
 * and the admin schema editor in `apps/web/src/components/admin/category-schema-editor.tsx`
 * both consume this module — DO NOT hardcode these values elsewhere.
 *
 * Adding a new Facebook value: append it here + add a test that asserts the
 * Spanish string is present (catches typos at the source). Removing a value
 * requires a migration if it is already persisted in any `attribute_schema`.
 */

export type Locale = "es" | "en";

export interface FacebookValue {
  /**
   * Canonical key used in form state and DB. Snake_case, derived from the
   * Spanish value (lower-cased, accents removed, spaces/dashes → underscores).
   * Used as the discriminator across locales.
   */
  readonly key: string;
  /** Display text in Spanish (Facebook LATAM/Spain official). */
  readonly es: string;
  /** Display text in English (translated for US/UK/CA). */
  readonly en: string;
}

export type FacebookFieldKey =
  "category" | "type" | "body_style" | "state" | "fuel_type" | "transmission";

/**
 * Static catalog. Each field's values are kept as `readonly` tuples so the
 * structure survives `Object.freeze` at the module level.
 */
export const FACEBOOK_VALUES: Readonly<
  Record<FacebookFieldKey, readonly FacebookValue[]>
> = Object.freeze({
  category: [
    { key: "vehiculo", es: "Vehiculo", en: "Vehicle" },
    {
      key: "propiedad_en_venta_o_alquiler",
      es: "Propiedad_en_venta_o_alquiler",
      en: "Property for sale or rent",
    },
    { key: "un_articulo", es: "Un_articulo", en: "Single item" },
    { key: "varios_articulo", es: "Varios_articulo", en: "Multiple items" },
  ],
  type: [
    { key: "auto_camioneta", es: "Auto/camioneta", en: "Car/Truck" },
    { key: "motocicleta", es: "Motocicleta", en: "Motorcycle" },
    { key: "todoterreno", es: "Todoterreno", en: "Off-road" },
    {
      key: "casas_rodante_caravana",
      es: "Casas_rodante/caravana",
      en: "RV/Caravan",
    },
    { key: "remolque", es: "Remolque", en: "Trailer" },
    { key: "barco", es: "Barco", en: "Boat" },
    { key: "barcos", es: "barcos", en: "Boats" },
    {
      key: "comercial_industrial",
      es: "Comercial/industrial",
      en: "Commercial/Industrial",
    },
    { key: "otro", es: "Otro", en: "Other" },
    { key: "articulo", es: "articulo", en: "Article" },
    { key: "varios", es: "varios", en: "Various" },
    { key: "departamento", es: "Departamento", en: "Apartment" },
    { key: "casa", es: "Casa", en: "House" },
    {
      key: "casa_adosada_townhouse",
      es: "Casa_adosada/townhouse",
      en: "Townhouse",
    },
  ],
  body_style: [
    { key: "coupe", es: "Coupé", en: "Coupe" },
    { key: "camioneta", es: "Camioneta", en: "Pickup truck" },
    { key: "sedan", es: "Sedán", en: "Sedan" },
    { key: "hatchback", es: "Hatchback", en: "Hatchback" },
    { key: "suv", es: "SUV", en: "SUV" },
    { key: "convertible", es: "Convertible", en: "Convertible" },
    { key: "familiar", es: "Familiar", en: "Wagon/Station wagon" },
    { key: "minivan", es: "Miniván", en: "Minivan" },
    { key: "auto_pequeno", es: "Auto_pequeño", en: "Small car" },
    { key: "otro", es: "Otro", en: "Other" },
  ],
  state: [
    { key: "excelente", es: "Excelente", en: "Excellent" },
    { key: "muy_bueno", es: "Muy_bueno", en: "Very good" },
    { key: "bueno", es: "Bueno", en: "Good" },
    { key: "aceptable", es: "Aceptable", en: "Acceptable" },
    { key: "malo", es: "Malo", en: "Poor" },
  ],
  fuel_type: [
    { key: "diesel", es: "Diésel", en: "Diesel" },
    { key: "electrico", es: "Eléctrico", en: "Electric" },
    { key: "flexible", es: "Flexible", en: "Flex" },
    { key: "gasolina", es: "Gasolina", en: "Gasoline" },
    { key: "hibrido", es: "Hibrido", en: "Hybrid" },
    {
      key: "hibrido_electrico_enchufable",
      es: "Híbrido_eléctrico_enchufable",
      en: "Plug-in hybrid",
    },
    { key: "otro", es: "Otro", en: "Other" },
  ],
  transmission: [
    {
      key: "transmision_automatica",
      es: "Transmisión_automática",
      en: "Automatic transmission",
    },
    {
      key: "transmision_manual",
      es: "Transmisión_manual",
      en: "Manual transmission",
    },
  ],
});

/** All supported field keys in a stable order. */
export const FACEBOOK_FIELD_KEYS: readonly FacebookFieldKey[] = Object.freeze([
  "category",
  "type",
  "body_style",
  "state",
  "fuel_type",
  "transmission",
] as const);

/**
 * Return the display string for `field.key` in the given locale. Falls back
 * to Spanish if the locale does not have a translation (should never happen
 * given the static catalog, but defends against runtime data drift).
 */
export function getValueLabel(
  field: FacebookFieldKey,
  key: string,
  locale: Locale,
): string {
  const entry = FACEBOOK_VALUES[field].find((v) => v.key === key);
  if (!entry) {
    // Unknown key — return the key itself so the publisher sees something
    // explicit instead of silently dropping the field. The publisher logs
    // the unknown key separately for follow-up.
    return key;
  }
  return entry[locale] ?? entry.es;
}

/**
 * Return the list of `FacebookValue` for a given field. Cheap O(1) — the
 * catalog is frozen at module load.
 */
export function getValues(field: FacebookFieldKey): readonly FacebookValue[] {
  return FACEBOOK_VALUES[field];
}

/**
 * Resolve a `key` from the Spanish display string (used when loading a
 * previously-saved product whose attributes were stored as the official
 * Spanish string — common path when migrating from the previous hardcoded
 * schema).
 *
 * Returns `undefined` if no match. Caller must decide whether to treat an
 * unknown Spanish string as an error or as a free-form fallback.
 */
export function findKeyBySpanishValue(
  field: FacebookFieldKey,
  spanishValue: string,
): string | undefined {
  const entry = FACEBOOK_VALUES[field].find((v) => v.es === spanishValue);
  return entry?.key;
}

/**
 * Decide which locale a Facebook account speaks based on the org's country.
 * Conservative mapping — anything we don't explicitly recognize defaults to
 * Spanish (matches the spreadsheet's source language and is the safer pick
 * for LATAM publishers, which is the project's primary market).
 */
export function localeForCountry(country: string | null | undefined): Locale {
  if (!country) return "es";
  const c = country.trim().toLowerCase();
  // English-speaking markets (US, UK, CA, AU, IE, NZ + common aliases).
  const enAliases = new Set([
    "us",
    "usa",
    "u.s.",
    "u.s.a.",
    "united states",
    "united states of america",
    "estados unidos",
    "uk",
    "u.k.",
    "united kingdom",
    "reino unido",
    "gb",
    "great britain",
    "ca",
    "canada",
    "canadá",
    "au",
    "australia",
    "ie",
    "ireland",
    "nz",
    "new zealand",
  ]);
  return enAliases.has(c) ? "en" : "es";
}
