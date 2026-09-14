import { describe, expect, it } from "vitest";
import { getMileageFieldOverride } from "./mileageUnit";

describe("getMileageFieldOverride", () => {
  it("returns miles for the US client's country value", () => {
    expect(getMileageFieldOverride("Estados Unidos")).toEqual({
      label: "Millaje",
      unit: "mi",
    });
  });

  it("matches case-insensitively and trims whitespace", () => {
    expect(getMileageFieldOverride("  united STATES  ")).toEqual({
      label: "Millaje",
      unit: "mi",
    });
  });

  it("defaults to kilometers for a non-US country", () => {
    expect(getMileageFieldOverride("Paraguay")).toEqual({
      label: "Kilometraje",
      unit: "km",
    });
  });

  it("defaults to kilometers when country is missing", () => {
    expect(getMileageFieldOverride(undefined)).toEqual({
      label: "Kilometraje",
      unit: "km",
    });
    expect(getMileageFieldOverride(null)).toEqual({
      label: "Kilometraje",
      unit: "km",
    });
  });
});
