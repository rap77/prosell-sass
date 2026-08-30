import { afterEach, describe, expect, it } from "vitest";
import { buildOAuthAuthorizeUrl } from "@/lib/auth/oauthRedirect";

// `?? "http://localhost:8000"` only falls back on null/undefined (not on an
// empty string), so exercising the "unset" branch requires actually deleting
// the env var rather than stubbing it to "" — `vi.stubEnv` cannot express
// "no value", so we manage process.env directly here and restore it after
// each test.
const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL;

describe("buildOAuthAuthorizeUrl", () => {
  afterEach(() => {
    if (ORIGINAL_API_URL === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL;
    }
  });

  it("builds the google authorize URL using the default base when NEXT_PUBLIC_API_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(buildOAuthAuthorizeUrl("google")).toBe(
      "http://localhost:8000/api/auth/oauth/google/authorize",
    );
  });

  it("builds the microsoft authorize URL using the default base when NEXT_PUBLIC_API_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(buildOAuthAuthorizeUrl("microsoft")).toBe(
      "http://localhost:8000/api/auth/oauth/microsoft/authorize",
    );
  });

  it("uses NEXT_PUBLIC_API_URL for google when it is configured", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.prosell.example";
    expect(buildOAuthAuthorizeUrl("google")).toBe(
      "https://api.prosell.example/api/auth/oauth/google/authorize",
    );
  });

  it("uses NEXT_PUBLIC_API_URL for microsoft when it is configured", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.prosell.example";
    expect(buildOAuthAuthorizeUrl("microsoft")).toBe(
      "https://api.prosell.example/api/auth/oauth/microsoft/authorize",
    );
  });

  it("is a pure function — it does not touch window.location", () => {
    const before = window.location.href;
    buildOAuthAuthorizeUrl("google");
    buildOAuthAuthorizeUrl("microsoft");
    expect(window.location.href).toBe(before);
  });
});
