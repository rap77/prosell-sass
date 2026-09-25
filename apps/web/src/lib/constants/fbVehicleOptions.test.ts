import { describe, it, expect } from "vitest";
import { resolveVehicleConditionKey } from "./fbVehicleOptions";

// Bug fix (2026-09-25): a CSV-imported vehicle's condition rating
// ("Muy bueno", etc.) was stored under attributes.title_state — a key
// the "Estado del vehículo" select (FB_VEHICLE_CONDITIONS) never read —
// so the select always rendered unselected regardless of what the CSV
// said. This resolver is the boundary that translates the free-text
// Spanish label into the select's canonical key.
describe("resolveVehicleConditionKey", () => {
  it("resolves an exact Spanish label to its canonical key", () => {
    expect(resolveVehicleConditionKey("Muy bueno")).toBe("very_good");
    expect(resolveVehicleConditionKey("Excelente")).toBe("excellent");
    expect(resolveVehicleConditionKey("Bueno")).toBe("good");
    expect(resolveVehicleConditionKey("Aceptable")).toBe("fair");
    expect(resolveVehicleConditionKey("Malo")).toBe("poor");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resolveVehicleConditionKey("  muy BUENO  ")).toBe("very_good");
  });

  it("resolves the 'Regular' synonym to the 'fair' tier", () => {
    expect(resolveVehicleConditionKey("Regular")).toBe("fair");
  });

  it("returns undefined for an unrecognized value", () => {
    expect(resolveVehicleConditionKey("garbage")).toBeUndefined();
  });

  it("returns undefined for empty/missing input", () => {
    expect(resolveVehicleConditionKey(undefined)).toBeUndefined();
    expect(resolveVehicleConditionKey("")).toBeUndefined();
  });
});
