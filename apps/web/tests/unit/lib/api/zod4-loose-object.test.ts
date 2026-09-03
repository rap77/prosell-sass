import { describe, it, expect } from "vitest";
import { OrganizationSchema } from "@/lib/api/schemas/organizations";
import { UserResponseSchema } from "@/lib/api/schemas/authApi";
import {
  FIXED_FIELDS_SCHEMA,
  FIXED_FIELDS_SCHEMA_LOOSE,
} from "@/components/forms/UnifiedProductForm";

describe("Zod 3 → 4 migration: .passthrough() → z.looseObject()", () => {
  it("tolerates unknown backend fields on a migrated schema (OrganizationSchema)", () => {
    const raw = {
      id: "org-1",
      name: "ProSell Motors",
      tenant_id: "tenant-1",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      unrendered_backend_field: "should be tolerated, not rejected",
    };

    const parsed = OrganizationSchema.parse(raw);

    expect(parsed.id).toBe("org-1");
    expect((parsed as Record<string, unknown>).unrendered_backend_field).toBe(
      "should be tolerated, not rejected",
    );
  });

  it("still validates required fields on a migrated schema (UserResponseSchema)", () => {
    expect(() =>
      UserResponseSchema.parse({
        id: "user-1",
        email: "user@example.com",
        // missing first_name/last_name/role/is_email_verified — must still fail
        extra_field: "tolerated",
      }),
    ).toThrow();
  });

  it("FIXED_FIELDS_SCHEMA_LOOSE (UnifiedProductForm outlier) tolerates extra category attributes", () => {
    const parsed = FIXED_FIELDS_SCHEMA_LOOSE.parse({
      price: 100,
      description: "test",
      vin: "1HGCM82633A004352",
    });
    expect((parsed as Record<string, unknown>).vin).toBe("1HGCM82633A004352");
  });

  it("FIXED_FIELDS_SCHEMA (plain z.object(), used at the .merge(attrSchema) call site) still strips unknown fields, unlike the loose variant", () => {
    const parsed = FIXED_FIELDS_SCHEMA.parse({
      price: 100,
      description: "test",
      vin: "1HGCM82633A004352",
    });
    expect((parsed as Record<string, unknown>).vin).toBeUndefined();
  });
});
