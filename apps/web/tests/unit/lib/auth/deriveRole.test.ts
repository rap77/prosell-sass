import { describe, expect, it } from "vitest";
import { deriveRoleFromCookieData } from "@/lib/auth/deriveRole";

describe("deriveRoleFromCookieData", () => {
  it("returns roles[0] when roles is a non-empty array", () => {
    expect(deriveRoleFromCookieData({ roles: ["admin", "manager"] })).toBe(
      "admin",
    );
  });

  it("falls back to the legacy singular role field when roles is absent", () => {
    expect(deriveRoleFromCookieData({ role: "manager" })).toBe("manager");
  });

  it("prefers roles[0] over the legacy role field when both are present", () => {
    expect(
      deriveRoleFromCookieData({ role: "manager", roles: ["admin"] }),
    ).toBe("admin");
  });

  it("returns null when roles is an empty array and role is absent", () => {
    expect(deriveRoleFromCookieData({ roles: [] })).toBeNull();
  });

  it("returns null when neither role nor roles is present", () => {
    expect(deriveRoleFromCookieData({})).toBeNull();
  });

  it("ignores a non-string legacy role field", () => {
    expect(
      deriveRoleFromCookieData({ role: 123 as unknown as string }),
    ).toBeNull();
  });
});
