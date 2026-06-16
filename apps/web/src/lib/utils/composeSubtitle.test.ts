import { describe, it, expect } from "vitest";
import { composeSubtitle } from "./composeSubtitle";

describe("composeSubtitle", () => {
  it("returns empty string when template is null", () => {
    expect(composeSubtitle(null, { year: 2020 })).toBe("");
  });

  it("substitutes a single placeholder", () => {
    expect(composeSubtitle("{year}", { year: 2020 })).toBe("2020");
  });

  it("substitutes multiple placeholders with literal separator", () => {
    expect(
      composeSubtitle("{year} · {make} · {model}", {
        year: 2020,
        make: "Toyota",
        model: "Corolla",
      }),
    ).toBe("2020 · Toyota · Corolla");
  });

  it("drops a placeholder whose attribute is missing without producing double separators", () => {
    expect(
      composeSubtitle("{year} · {make} · {model}", {
        year: 2020,
        // make missing
        model: "Corolla",
      }),
    ).toBe("2020 · Corolla");
  });

  it("returns only literals when ALL placeholders are missing", () => {
    expect(composeSubtitle("Brand: {make} Model: {model}", {})).toBe(
      "Brand:  Model: ",
    );
    // Note: leading/trailing literals are preserved verbatim.
  });

  it("drops unknown placeholders (not in attributes) without crashing", () => {
    expect(
      composeSubtitle("{year} · {nonexistent}", { year: 2020 }),
    ).toBe("2020");
  });

  it("preserves empty string when template is empty", () => {
    expect(composeSubtitle("", { year: 2020 })).toBe("");
  });

  it("preserves surrounding literals when only the middle placeholder is missing", () => {
    expect(
      composeSubtitle("[{year}] [{make}] [{model}]", {
        year: 2020,
        model: "Corolla",
      }),
    ).toBe("[2020] [] [Corolla]");
  });

  it("coerces non-string values to string via String()", () => {
    expect(composeSubtitle("{m2} m²", { m2: 75 })).toBe("75 m²");
    expect(composeSubtitle("{covered}", { covered: true })).toBe("true");
  });

  it("does not crash on attributes that are objects or arrays (uses String())", () => {
    expect(
      composeSubtitle("{x}", { x: { nested: 1 } as unknown as string }),
    ).toBe("[object Object]");
  });
});
