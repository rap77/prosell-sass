import { describe, it, expect } from "vitest";

describe("Tailwind Configuration", () => {
  it("should extend spacing with the 4.5 step (1.125rem / 18px)", async () => {
    const config = await import("../../../tailwind.config");
    expect(config.default.theme?.extend?.spacing).toMatchObject({
      "4.5": "1.125rem",
    });
  });

  it("should extend spacing with the 8.5 step (2.125rem / 34px)", async () => {
    const config = await import("../../../tailwind.config");
    expect(config.default.theme?.extend?.spacing).toMatchObject({
      "8.5": "2.125rem",
    });
  });

  it("should extend spacing with the 9.5 step (2.375rem / 38px)", async () => {
    const config = await import("../../../tailwind.config");
    expect(config.default.theme?.extend?.spacing).toMatchObject({
      "9.5": "2.375rem",
    });
  });
});
