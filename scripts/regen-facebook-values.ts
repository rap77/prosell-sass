import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

interface SourceSection {
  readonly [label: string]: number | string;
}

interface SourceLocale {
  readonly [section: string]: SourceSection;
}

interface SourceCatalog {
  readonly es: SourceLocale;
  readonly en: SourceLocale;
}

interface FieldDefinition {
  readonly field: string;
  readonly constant: string;
  readonly source: string;
  readonly description: string;
}

interface Entry {
  readonly key: string;
  readonly es: string;
  readonly en: string;
  readonly facebookIds: { readonly es?: number; readonly en?: number };
}

const FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  {
    field: "label",
    constant: "LABEL",
    source: "labels",
    description: "UI labels",
  },
  {
    field: "category",
    constant: "CATEGORY",
    source: "categories",
    description: "Marketplace categories",
  },
  {
    field: "vehicle_type",
    constant: "VEHICLE_TYPE",
    source: "vehicleTypes",
    description: "Vehicle types",
  },
  {
    field: "body_style",
    constant: "BODY_STYLE",
    source: "bodyStyle",
    description: "Body styles",
  },
  {
    field: "vehicle_condition",
    constant: "VEHICLE_CONDITION",
    source: "vehicleConditions",
    description: "Vehicle conditions",
  },
  {
    field: "fuel_type",
    constant: "FUEL_TYPE",
    source: "fuelTypes",
    description: "Fuel types",
  },
  {
    field: "transmission",
    constant: "TRANSMISSION",
    source: "Transmissions",
    description: "Transmissions",
  },
  {
    field: "brand",
    constant: "BRAND",
    source: "Brands",
    description: "Vehicle brands",
  },
  { field: "year", constant: "YEAR", source: "Years", description: "Years" },
  {
    field: "exterior_color",
    constant: "EXTERIOR_COLOR",
    source: "exteriorColors",
    description: "Exterior colors",
  },
  {
    field: "interior_color",
    constant: "INTERIOR_COLOR",
    source: "interiorColors",
    description: "Interior colors",
  },
  {
    field: "item_state",
    constant: "ITEM_STATE",
    source: "states",
    description: "Item states",
  },
  {
    field: "platform",
    constant: "PLATFORM",
    source: "platforms",
    description: "Gaming platforms",
  },
  {
    field: "device",
    constant: "DEVICE",
    source: "devices",
    description: "Mobile devices",
  },
];

function isSourceSection(value: unknown): value is SourceSection {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourceLocale(value: unknown): value is SourceLocale {
  return isSourceSection(value) && Object.values(value).every(isSourceSection);
}

function parseCatalog(value: unknown): SourceCatalog {
  if (
    !isSourceSection(value) ||
    !isSourceLocale(value.es) ||
    !isSourceLocale(value.en)
  ) {
    throw new Error("Expected a catalog with es and en locale sections.");
  }
  return { es: value.es, en: value.en };
}

function canonicalKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\+/g, " plus ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function numericId(value: number | string | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function createEntries(
  catalog: SourceCatalog,
  definition: FieldDefinition,
): readonly Entry[] {
  const esSection = catalog.es[definition.source];
  const enSection = catalog.en[definition.source];
  if (!esSection || !enSection) {
    throw new Error(`Missing ${definition.source} in one locale.`);
  }

  const esEntries = Object.entries(esSection);
  const enEntries = Object.entries(enSection);
  if (esEntries.length !== enEntries.length) {
    throw new Error(`${definition.source} has different ES/EN entry counts.`);
  }

  const usedKeys = new Set<string>();
  return esEntries.map(([es, esValue], index) => {
    const [en, enValue] = enEntries[index];
    const spanishLabel =
      definition.source === "labels" && typeof esValue === "string"
        ? esValue
        : es;
    const englishLabel =
      definition.source === "labels" && typeof enValue === "string"
        ? enValue
        : en;
    const baseKey = canonicalKey(spanishLabel);
    let key = baseKey;
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }
    usedKeys.add(key);
    return {
      key,
      es: spanishLabel,
      en: englishLabel,
      facebookIds: { es: numericId(esValue), en: numericId(enValue) },
    };
  });
}

function renderIndex(catalog: SourceCatalog): string {
  const entries = FIELD_DEFINITIONS.map((definition) => ({
    definition,
    values: createEntries(catalog, definition),
  }));
  const fieldType = FIELD_DEFINITIONS.map(
    ({ field }) => `  | ${JSON.stringify(field)}`,
  ).join("\n");
  const docs = FIELD_DEFINITIONS.map(
    ({ field, description }) =>
      `  ${JSON.stringify(field)}: ${JSON.stringify(description)},`,
  ).join("\n");
  const constants = entries
    .map(({ definition, values }) => {
      const rows = values
        .map((entry) => `  ${JSON.stringify(entry)},`)
        .join("\n");
      return `export const ${definition.constant}_VALUES: readonly FacebookValue[] = Object.freeze([\n${rows}\n]);`;
    })
    .join("\n\n");
  const fields = FIELD_DEFINITIONS.map(
    ({ field }) => `  ${JSON.stringify(field)},`,
  ).join("\n");
  const map = FIELD_DEFINITIONS.map(
    ({ field, constant }) => `  ${JSON.stringify(field)}: ${constant}_VALUES,`,
  ).join("\n");

  return `/**
 * Facebook Marketplace values generated from an external publisher catalog.
 *
 * Regenerate with:
 *   bun scripts/regen-facebook-values.ts /path/to/marketplace_options.json
 *
 * The source is deliberately not copied into this repository. ES and EN values
 * are paired by source position because the source has inconsistent English
 * year IDs from 1999 downward. IDs remain locale-specific. Device IDs are also
 * not unique in the source, so lookup returns every matching value.
 */

export type Locale = "es" | "en";

export interface FacebookValue {
  readonly key: string;
  readonly es: string;
  readonly en: string;
  readonly facebookIds: Readonly<Partial<Record<Locale, number>>>;
}

export type FacebookFieldKey =
${fieldType};

export const FACEBOOK_FIELD_DOCS: Readonly<Record<FacebookFieldKey, string>> = Object.freeze({
${docs}
});

${constants}

export const FACEBOOK_FIELD_KEYS: readonly FacebookFieldKey[] = Object.freeze([
${fields}
]);

export const FACEBOOK_VALUES: Readonly<Record<FacebookFieldKey, readonly FacebookValue[]>> = Object.freeze({
${map}
});

export function getValueLabel(field: FacebookFieldKey, key: string, locale: Locale): string {
  const entry = FACEBOOK_VALUES[field].find((value) => value.key === key);
  return entry ? entry[locale] : key;
}

export function getValuesByFacebookId(
  field: FacebookFieldKey,
  facebookId: number,
  locale: Locale,
): readonly FacebookValue[] {
  return FACEBOOK_VALUES[field].filter((value) => value.facebookIds[locale] === facebookId);
}

export function getValues(field: FacebookFieldKey): readonly FacebookValue[] {
  return FACEBOOK_VALUES[field];
}

export function findKeyBySpanishValue(
  field: FacebookFieldKey,
  spanishValue: string,
): string | undefined {
  return FACEBOOK_VALUES[field].find((value) => value.es === spanishValue)?.key;
}

export function localeForCountry(country: string | null | undefined): Locale {
  if (!country) return "es";
  const normalized = country.trim().toLowerCase();
  const englishAliases = new Set([
    "us", "usa", "u.s.", "u.s.a.", "united states", "united states of america", "estados unidos",
    "uk", "u.k.", "united kingdom", "reino unido", "gb", "great britain", "ca", "canada", "canadá",
    "au", "australia", "ie", "ireland", "nz", "new zealand",
  ]);
  return englishAliases.has(normalized) ? "en" : "es";
}
`;
}

function renderTest(catalog: SourceCatalog): string {
  const expected = Object.fromEntries(
    FIELD_DEFINITIONS.map((definition) => [
      definition.field,
      createEntries(catalog, definition),
    ]),
  );
  return `import { describe, expect, it } from "vitest";
import {
  FACEBOOK_FIELD_KEYS,
  FACEBOOK_VALUES,
  findKeyBySpanishValue,
  getValueLabel,
  getValuesByFacebookId,
  localeForCountry,
} from "./index";

const expected = ${JSON.stringify(expected, null, 2)};

describe("Facebook Marketplace catalog", () => {
  it("preserves every source value, localized ID, and source ordering", () => {
    for (const field of FACEBOOK_FIELD_KEYS) {
      expect(FACEBOOK_VALUES[field]).toEqual(expected[field]);
    }
  });

  it("uses unique accent-free snake_case keys within every field", () => {
    for (const field of FACEBOOK_FIELD_KEYS) {
      const keys = FACEBOOK_VALUES[field].map((value) => value.key);
      expect(new Set(keys).size, field).toBe(keys.length);
      expect(keys.every((key) => /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(key)), field).toBe(true);
    }
  });

  it("preserves capitalization and accents in display labels", () => {
    expect(getValueLabel("body_style", "suv", "es")).toBe("SUV");
    expect(getValueLabel("body_style", "sedan", "es")).toBe("Sedán");
    expect(getValueLabel("fuel_type", "diesel", "es")).toBe("Diésel");
  });

  it("keeps the source's inconsistent year IDs locale-specific", () => {
    const year1999 = FACEBOOK_VALUES.year.find((value) => value.key === "1999");
    expect(year1999).toMatchObject({ es: "1999", en: "1999", facebookIds: { es: 29, en: 27 } });
  });

  it("returns all source matches for duplicate device IDs", () => {
    expect(getValuesByFacebookId("device", 60, "es").map((value) => value.es)).toEqual(["OPPO F3 Plus", "OPPO F7"]);
  });

  it("looks up keys and country locales", () => {
    expect(findKeyBySpanishValue("vehicle_type", "Auto/camioneta")).toBe("auto_camioneta");
    expect(localeForCountry("US")).toBe("en");
    expect(localeForCountry("MX")).toBe("es");
  });
});
`;
}

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error(
    "Usage: bun scripts/regen-facebook-values.ts /path/to/marketplace_options.json",
  );
}

const source = parseCatalog(
  JSON.parse(await readFile(resolve(sourcePath), "utf8")),
);
const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "apps/web/src/lib/i18n/facebook-values");
await writeFile(resolve(outputDirectory, "index.ts"), renderIndex(source));
await writeFile(resolve(outputDirectory, "index.test.ts"), renderTest(source));
