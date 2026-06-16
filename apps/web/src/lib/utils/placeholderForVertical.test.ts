import { describe, it, expect } from "vitest";
import { placeholderForVertical } from "./placeholderForVertical";

describe("placeholderForVertical", () => {
  it("maps the vehicles vertical slug to the vehicles placeholder", () => {
    expect(placeholderForVertical("vehiculos-y-transporte")).toBe(
      "/placeholders/placeholder-vehicles.webp",
    );
  });

  it("maps the real estate vertical slug to the realstate placeholder", () => {
    expect(placeholderForVertical("bienes-raices")).toBe(
      "/placeholders/placeholder-realstate.webp",
    );
  });

  it("returns the generic fallback for an unknown vertical slug", () => {
    expect(placeholderForVertical("unknown-niche")).toBe(
      "/placeholders/placeholder-generic.webp",
    );
  });

  it("returns the generic fallback for an empty slug", () => {
    expect(placeholderForVertical("")).toBe(
      "/placeholders/placeholder-generic.webp",
    );
  });
});
