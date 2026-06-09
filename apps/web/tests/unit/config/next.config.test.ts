import { describe, it, expect } from "vitest";

describe("Next.js Configuration", () => {
  it("should have React Compiler enabled", async () => {
    const config = await import("../../../next.config");
    expect(config.default).toBeDefined();
    expect(config.default.reactCompiler).toBe(true);
  });

  it("should have standalone output mode", async () => {
    const config = await import("../../../next.config");
    expect(config.default.output).toBe("standalone");
  });

  it("should have optimizePackageImports configured", async () => {
    const config = await import("../../../next.config");
    expect(config.default.experimental).toBeDefined();
    expect(config.default.experimental?.optimizePackageImports).toContain(
      "lucide-react",
    );
    expect(config.default.experimental?.optimizePackageImports).toContain(
      "@/components/icons",
    );
  });
});
