import { describe, it, expect } from "vitest";
import {
  FACEBOOK_VALUES,
  FACEBOOK_FIELD_KEYS,
  findKeyBySpanishValue,
  getValueLabel,
  getValues,
  localeForCountry,
  type FacebookFieldKey,
} from "./index";

describe("FACEBOOK_VALUES catalog", () => {
  it("has values for every documented field key", () => {
    for (const field of FACEBOOK_FIELD_KEYS) {
      expect(FACEBOOK_VALUES[field].length, field).toBeGreaterThan(0);
    }
  });

  it("has unique keys within each field", () => {
    for (const field of FACEBOOK_FIELD_KEYS) {
      const keys = FACEBOOK_VALUES[field].map((v) => v.key);
      const unique = new Set(keys);
      expect(unique.size, `${field} keys: ${keys.join(",")}`).toBe(keys.length);
    }
  });

  it("has unique Spanish values within each field", () => {
    for (const field of FACEBOOK_FIELD_KEYS) {
      const es = FACEBOOK_VALUES[field].map((v) => v.es);
      const unique = new Set(es);
      expect(unique.size, `${field} es duplicates`).toBe(es.length);
    }
  });

  it("every value has both es and en translations", () => {
    for (const field of FACEBOOK_FIELD_KEYS) {
      for (const v of FACEBOOK_VALUES[field]) {
        expect(v.es.length, `${field}/${v.key} es`).toBeGreaterThan(0);
        expect(v.en.length, `${field}/${v.key} en`).toBeGreaterThan(0);
      }
    }
  });
});

describe("getValues", () => {
  it("returns the full list for each field", () => {
    expect(getValues("fuel_type").length).toBe(7);
    expect(getValues("state").length).toBe(5);
    expect(getValues("body_style").length).toBe(10);
    expect(getValues("transmission").length).toBe(2);
  });
});

describe("getValueLabel", () => {
  it("returns the Spanish label for locale=es", () => {
    expect(getValueLabel("fuel_type", "gasolina", "es")).toBe("Gasolina");
    expect(getValueLabel("body_style", "sedan", "es")).toBe("Sedán");
    expect(getValueLabel("fuel_type", "diesel", "es")).toBe("Diésel");
  });

  it("returns the English label for locale=en", () => {
    expect(getValueLabel("fuel_type", "gasolina", "en")).toBe("Gasoline");
    expect(getValueLabel("body_style", "sedan", "en")).toBe("Sedan");
    expect(getValueLabel("fuel_type", "diesel", "en")).toBe("Diesel");
  });

  it("returns the key itself when no entry matches (defensive fallback)", () => {
    expect(getValueLabel("fuel_type", "no_existe", "es")).toBe("no_existe");
    expect(getValueLabel("fuel_type", "no_existe", "en")).toBe("no_existe");
  });
});

describe("findKeyBySpanishValue", () => {
  it("finds the canonical key for an official Spanish string", () => {
    expect(findKeyBySpanishValue("fuel_type", "Diésel")).toBe("diesel");
    expect(findKeyBySpanishValue("body_style", "Sedán")).toBe("sedan");
    expect(
      findKeyBySpanishValue("transmission", "Transmisión_automática"),
    ).toBe("transmision_automatica");
    expect(findKeyBySpanishValue("type", "Auto/camioneta")).toBe(
      "auto_camioneta",
    );
  });

  it("returns undefined for unknown Spanish strings", () => {
    expect(
      findKeyBySpanishValue("fuel_type", "Gasolina Premium"),
    ).toBeUndefined();
    expect(findKeyBySpanishValue("body_style", "Coupe")).toBeUndefined();
  });
});

describe("localeForCountry", () => {
  it("returns 'en' for English-speaking countries (case-insensitive)", () => {
    expect(localeForCountry("US")).toBe("en");
    expect(localeForCountry("us")).toBe("en");
    expect(localeForCountry("Estados Unidos")).toBe("en");
    expect(localeForCountry("United States")).toBe("en");
    expect(localeForCountry("UK")).toBe("en");
    expect(localeForCountry("Canada")).toBe("en");
    expect(localeForCountry("AU")).toBe("en");
  });

  it("returns 'es' for Latin America and Europe", () => {
    expect(localeForCountry("MX")).toBe("es");
    expect(localeForCountry("Mexico")).toBe("es");
    expect(localeForCountry("AR")).toBe("es");
    expect(localeForCountry("Paraguay")).toBe("es");
    expect(localeForCountry("España")).toBe("es");
    expect(localeForCountry("Spain")).toBe("es");
  });

  it("defaults to 'es' for missing or empty country", () => {
    expect(localeForCountry(null)).toBe("es");
    expect(localeForCountry(undefined)).toBe("es");
    expect(localeForCountry("")).toBe("es");
    expect(localeForCountry("ZZ")).toBe("es");
  });
});

describe("Spanish values match Facebook official spreadsheet (regression)", () => {
  // Lock-in the exact strings that Facebook's Marketplace accepts. Changing
  // these is a publish-time breaking change — any test that requires updating
  // means Facebook's API contract has shifted.
  const expectedSpanish: Record<FacebookFieldKey, readonly string[]> = {
    category: [
      "Vehiculo",
      "Propiedad_en_venta_o_alquiler",
      "Un_articulo",
      "Varios_articulo",
    ],
    type: [
      "articulo",
      "varios",
      "Auto/camioneta",
      "Motocicleta",
      "Todoterreno",
      "Casas_rodante/caravana",
      "Remolque",
      "Barco",
      "barcos",
      "Comercial/industrial",
      "Otro",
      "Departamento",
      "Casa",
      "Casa_adosada/townhouse",
    ],
    body_style: [
      "Coupé",
      "Camioneta",
      "Sedán",
      "Hatchback",
      "SUV",
      "Convertible",
      "Familiar",
      "Miniván",
      "Auto_pequeño",
      "Otro",
    ],
    state: ["Excelente", "Muy_bueno", "Bueno", "Aceptable", "Malo"],
    fuel_type: [
      "Diésel",
      "Eléctrico",
      "Flexible",
      "Gasolina",
      "Hibrido",
      "Híbrido_eléctrico_enchufable",
      "Otro",
    ],
    transmission: ["Transmisión_automática", "Transmisión_manual"],
  };

  for (const field of FACEBOOK_FIELD_KEYS) {
    it(`${field} matches the official Spanish strings`, () => {
      const actual = FACEBOOK_VALUES[field].map((v) => v.es).sort();
      const expected = [...expectedSpanish[field]].sort();
      expect(actual).toEqual(expected);
    });
  }
});
