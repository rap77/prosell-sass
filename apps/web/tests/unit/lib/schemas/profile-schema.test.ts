import { describe, it, expect } from "vitest";
import { profileSchema } from "@/app/(seller)/settings/profile/page";

describe("Zod 3 → 4 migration: profile page email field (.string().email() → z.email())", () => {
  const validBase = {
    firstName: "Juan",
    lastName: "Perez",
    phone: "",
  };

  it("accepts a valid email", () => {
    const parsed = profileSchema.parse({
      ...validBase,
      email: "juan@example.com",
    });
    expect(parsed.email).toBe("juan@example.com");
  });

  it("rejects an invalid email with the expected Spanish message", () => {
    const result = profileSchema.safeParse({
      ...validBase,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Correo inválido");
    }
  });
});
