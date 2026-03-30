/**
 * Next.js Configuration Tests
 *
 * Verifies React Compiler is enabled for Phase 09
 */

import { describe, it, expect } from "vitest";

describe("Next.js Configuration", () => {
  it("should have React Compiler enabled", async () => {
    // Import the config to verify it's valid TypeScript
    const config = await import("../../../../next.config.ts");

    // Verify reactCompiler is enabled
    expect(config.default).toBeDefined();
    expect(config.default.reactCompiler).toBe(true);
  });

  it("should have standalone output mode", async () => {
    const config = await import("../../../../next.config.ts");

    expect(config.default.output).toBe("standalone");
  });

  it("should have optimizePackageImports configured", async () => {
    const config = await import("../../../../next.config.ts");

    expect(config.default.experimental).toBeDefined();
    expect(config.default.experimental.optimizePackageImports).toContain(
      "lucide-react",
    );
    expect(config.default.experimental.optimizePackageImports).toContain(
      "@/components/icons",
    );
  });
});
