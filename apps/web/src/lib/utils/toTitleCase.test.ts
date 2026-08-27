import { describe, expect, it } from "vitest";
import { toTitleCase } from "./toTitleCase";

describe("toTitleCase", () => {
  it("capitalizes a single lowercase word", () => {
    expect(toTitleCase("spark")).toBe("Spark");
  });

  it("normalizes an all-caps two-word value", () => {
    expect(toTitleCase("HONDA CIVIC")).toBe("Honda Civic");
  });

  it("capitalizes after a hyphen", () => {
    expect(toTitleCase("mercedes-benz")).toBe("Mercedes-Benz");
  });

  it("handles mixed-case input", () => {
    expect(toTitleCase("ToYoTa")).toBe("Toyota");
  });

  it("returns an empty string unchanged", () => {
    expect(toTitleCase("")).toBe("");
  });
});
