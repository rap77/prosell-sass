import { describe, it, expect } from "vitest";

describe("apps/web dependency versions (Next.js / React bump)", () => {
  it("pins Next.js to at least 16.3.3", async () => {
    const pkg = await import("../../../package.json");
    expect(pkg.default.dependencies.next).toBe("^16.3.3");
  });

  it("pins React and React DOM to at least 19.2.8", async () => {
    const pkg = await import("../../../package.json");
    expect(pkg.default.dependencies.react).toBe("^19.2.8");
    expect(pkg.default.dependencies["react-dom"]).toBe("^19.2.8");
  });

  it("pins @types/react and @types/react-dom to the 19.2.x line", async () => {
    const pkg = await import("../../../package.json");
    expect(pkg.default.devDependencies["@types/react"]).toBe("^19.2.0");
    expect(pkg.default.devDependencies["@types/react-dom"]).toBe("^19.2.0");
  });

  it("pins eslint-config-next to the Next.js 16.3.x line", async () => {
    const pkg = await import("../../../package.json");
    expect(pkg.default.devDependencies["eslint-config-next"]).toBe("^16.3.3");
  });
});
