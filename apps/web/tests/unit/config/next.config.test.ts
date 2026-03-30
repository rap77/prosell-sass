/**
 * Next.js Configuration Tests
 *
 * Verifies React Compiler is enabled for Phase 09
 */

import { describe, it, expect } from "vitest";

// Use // @ts-expect-error because we're importing a config file outside src/
// TypeScript can't resolve this path properly in tests
describe("Next.js Configuration", () => {
  it("should have React Compiler enabled", async () => {
    // Import the config to verify it's valid TypeScript
    // @ts-expect-error - Config file outside src/ directory
    const config = await import("../../next.config");

    // Verify reactCompiler is enabled
    expect(config.default).toBeDefined();
    expect(config.default.reactCompiler).toBe(true);
  });

  it("should have standalone output mode", async () => {
    // @ts-expect-error - Config file outside src/ directory
    const config = await import("../../next.config");

    expect(config.default.output).toBe("standalone");
  });

  it("should have optimizePackageImports configured", async () => {
    // @ts-expect-error - Config file outside src/ directory
    const config = await import("../../next.config");

    expect(config.default.experimental).toBeDefined();
    expect(config.default.experimental.optimizePackageImports).toContain(
      "lucide-react",
    );
    expect(config.default.experimental.optimizePackageImports).toContain(
      "@/components/icons",
    );
  });
});
