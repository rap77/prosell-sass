import { describe, expect, it } from "vitest";
import { Permission, userHasPermission } from "@/lib/auth/permissions";

describe("userHasPermission", () => {
  it("returns true when the role's permission set includes it", () => {
    expect(userHasPermission("admin", Permission.DEALER_ADMIN_VIEW_ALL)).toBe(
      true,
    );
  });

  it("returns false when the role's permission set lacks it", () => {
    expect(
      userHasPermission("sales_user", Permission.DEALER_ADMIN_VIEW_ALL),
    ).toBe(false);
  });

  it("returns false for a null role", () => {
    expect(userHasPermission(null, Permission.DEALER_ADMIN_VIEW_ALL)).toBe(
      false,
    );
  });

  it("returns false for an unknown role string", () => {
    expect(
      userHasPermission("not-a-role", Permission.DEALER_ADMIN_VIEW_ALL),
    ).toBe(false);
  });
});
