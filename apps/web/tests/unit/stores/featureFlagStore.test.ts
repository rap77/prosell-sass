/**
 * TDD: featureFlagStore Tests (Zustand)
 * Tests unitarios del store de feature flags
 */

import { cleanup } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { useFeatureFlagStore, DEFAULT_FLAGS } from "@/stores/featureFlagStore";

// Setup: Clear localStorage and reset store before each test
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useFeatureFlagStore.getState().reset();
});

// Cleanup: Clear localStorage after each test
afterEach(() => {
  useFeatureFlagStore.getState().reset();
  localStorage.clear();
  cleanup();
});

describe("featureFlagStore - Initial State", () => {
  it("should have correct default flags", () => {
    const { get } = useFeatureFlagStore.getState();

    expect(get("auth-init-fix")).toBe(true);
    expect(get("oauth-preload")).toBe(true);
    expect(get("svg-wrapper")).toBe(true);
  });

  it("should match DEFAULT_FLAGS constant", () => {
    const { flags } = useFeatureFlagStore.getState();

    expect(flags).toEqual(DEFAULT_FLAGS);
  });
});

describe("featureFlagStore - get() method", () => {
  it("should return default value for nonexistent flag", () => {
    const { get } = useFeatureFlagStore.getState();

    expect(get("nonexistent", true)).toBe(true);
    expect(get("nonexistent", false)).toBe(false);
    expect(get("nonexistent")).toBe(false); // default is false
  });

  it("should return flag value if exists", () => {
    const store = useFeatureFlagStore.getState();

    expect(store.get("auth-init-fix")).toBe(true);
  });
});

describe("featureFlagStore - set() method", () => {
  it("should set and persist flag", () => {
    const { get, set } = useFeatureFlagStore.getState();

    set("test-flag", true);
    expect(get("test-flag")).toBe(true);

    set("test-flag", false);
    expect(get("test-flag")).toBe(false);
  });

  it("should update existing flag", () => {
    const { get, set } = useFeatureFlagStore.getState();

    expect(get("auth-init-fix")).toBe(true);

    set("auth-init-fix", false);
    expect(get("auth-init-fix")).toBe(false);
  });

  it("should not affect other flags when setting one", () => {
    const { get, set } = useFeatureFlagStore.getState();

    set("auth-init-fix", false);

    expect(get("auth-init-fix")).toBe(false);
    expect(get("oauth-preload")).toBe(true); // unchanged
    expect(get("svg-wrapper")).toBe(true); // unchanged
  });
});

describe("featureFlagStore - reset() method", () => {
  it("should reset all flags to defaults", () => {
    const { get, set, reset } = useFeatureFlagStore.getState();

    // Modify flags
    set("auth-init-fix", false);
    set("oauth-preload", false);
    set("svg-wrapper", false);

    // Verify they're modified
    expect(get("auth-init-fix")).toBe(false);
    expect(get("oauth-preload")).toBe(false);
    expect(get("svg-wrapper")).toBe(false);

    // Reset
    reset();

    // Verify back to defaults
    expect(get("auth-init-fix")).toBe(true);
    expect(get("oauth-preload")).toBe(true);
    expect(get("svg-wrapper")).toBe(true);
  });

  it("should clear custom flags on reset", () => {
    const { get, set, reset } = useFeatureFlagStore.getState();

    set("custom-flag", true);
    expect(get("custom-flag", false)).toBe(true);

    reset();

    // Custom flag should be gone (returns default value)
    expect(get("custom-flag", false)).toBe(false);
  });
});

describe("featureFlagStore - localStorage persistence", () => {
  it("should persist flags to localStorage", () => {
    const { get, set } = useFeatureFlagStore.getState();

    set("auth-init-fix", false);

    // Check localStorage directly
    const stored = localStorage.getItem("feature-flags");
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.flags["auth-init-fix"]).toBe(false);
  });

  it("should persist and survive page reload (simulated)", () => {
    const { get, set } = useFeatureFlagStore.getState();

    // Set a value
    set("auth-init-fix", false);
    set("oauth-preload", false);
    expect(get("auth-init-fix")).toBe(false);
    expect(get("oauth-preload")).toBe(false);

    // Simulate page reload by checking localStorage
    const stored = localStorage.getItem("feature-flags");
    const parsed = JSON.parse(stored!);

    expect(parsed.state.flags["auth-init-fix"]).toBe(false);
    expect(parsed.state.flags["oauth-preload"]).toBe(false);
    expect(parsed.state.flags["svg-wrapper"]).toBe(true);
  });
});

describe("featureFlagStore - localStorage unavailable fallback", () => {
  it("should work when localStorage is unavailable", () => {
    // Store original localStorage
    const originalLocalStorage = global.localStorage;

    // Mock localStorage to throw errors
    const mockLocalStorage = {
      getItem: vi.fn(() => {
        throw new Error("localStorage unavailable");
      }),
      setItem: vi.fn(() => {
        throw new Error("localStorage unavailable");
      }),
      removeItem: vi.fn(() => {
        throw new Error("localStorage unavailable");
      }),
      clear: vi.fn(() => {
        throw new Error("localStorage unavailable");
      }),
      length: 0,
      key: vi.fn(() => null),
    };

    try {
      // Replace global localStorage
      Object.defineProperty(global, "localStorage", {
        value: mockLocalStorage,
        writable: true,
      });

      // Store should still work (in-memory fallback)
      const { get, set } = useFeatureFlagStore.getState();

      expect(get("auth-init-fix")).toBe(true);

      set("auth-init-fix", false);
      expect(get("auth-init-fix")).toBe(false);
    } finally {
      // Restore original localStorage
      Object.defineProperty(global, "localStorage", {
        value: originalLocalStorage,
        writable: true,
      });
    }
  });
});
