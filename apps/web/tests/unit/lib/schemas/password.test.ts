import { describe, expect, it } from "vitest";
import { passwordFieldSchema } from "@/lib/schemas/password";

describe("passwordFieldSchema", () => {
  it("accepts a password with upper, lower, number, and special char", () => {
    expect(passwordFieldSchema.safeParse("Aa1!aaaa").success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = passwordFieldSchema.safeParse("Aa1!aaa");
    expect(result.success).toBe(false);
  });

  it("rejects a password with no special character", () => {
    const result = passwordFieldSchema.safeParse("Aa1aaaaa");
    expect(result.success).toBe(false);
  });

  it("rejects a password with no uppercase letter", () => {
    const result = passwordFieldSchema.safeParse("aa1!aaaa");
    expect(result.success).toBe(false);
  });
});
