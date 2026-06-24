import { describe, it, expect } from "vitest";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";

describe("extractErrorMessage", () => {
  it("extracts a string detail", () => {
    expect(
      extractErrorMessage(
        { detail: "owner_email is already registered" },
        "fallback",
      ),
    ).toBe("owner_email is already registered");
  });

  it("extracts a message field", () => {
    expect(extractErrorMessage({ message: "boom" }, "fallback")).toBe("boom");
  });

  it("extracts the first msg from a FastAPI 422 validation error array", () => {
    const body = {
      detail: [
        {
          type: "value_error",
          loc: ["body", "owner_email"],
          msg: "value is not a valid email address",
        },
      ],
    };
    expect(extractErrorMessage(body, "fallback")).toBe(
      "value is not a valid email address",
    );
  });

  it("falls back when detail array has no msg", () => {
    expect(
      extractErrorMessage({ detail: [{ loc: ["body"] }] }, "fallback"),
    ).toBe("fallback");
  });

  it("falls back on an unrecognized shape", () => {
    expect(extractErrorMessage({ foo: "bar" }, "fallback")).toBe("fallback");
  });
});
