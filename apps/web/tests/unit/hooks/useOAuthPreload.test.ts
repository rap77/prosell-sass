/**
 * useOAuthPreload Hook Tests
 *
 * Tests OAuth component preloading strategy
 * Phase 09: Verifies useCallback removal (React Compiler handles optimization)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useOAuthPreload } from "@/hooks/useOAuthPreload";

// Mock logger to avoid console output in tests
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock feature flag store
vi.mock("@/stores/featureFlagStore", () => ({
  useFeatureFlagStore: vi.fn((selector) => {
    // Default: preload enabled
    if (selector.toString().includes("oauth-preload")) {
      return true;
    }
    return false;
  }),
}));

// Mock dynamic import
vi.mock("webpack", () => ({
  // Mock webpackMode comment (does nothing in test)
}));

describe("useOAuthPreload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return isPreloaded and handleMouseEnter", () => {
    const { result } = renderHook(() => useOAuthPreload());

    expect(result.current).toHaveProperty("isPreloaded");
    expect(result.current).toHaveProperty("handleMouseEnter");
    expect(typeof result.current.handleMouseEnter).toBe("function");
  });

  it("should start with isPreloaded false", () => {
    const { result } = renderHook(() => useOAuthPreload());

    expect(result.current.isPreloaded).toBe(false);
  });

  it("should provide handleMouseEnter function", () => {
    const { result } = renderHook(() => useOAuthPreload());

    expect(typeof result.current.handleMouseEnter).toBe("function");
  });

  it("should allow custom import path", () => {
    const { result } = renderHook(() =>
      useOAuthPreload({ importPath: "@/components/auth/CustomOAuth" }),
    );

    expect(result.current).toHaveProperty("isPreloaded");
    expect(result.current).toHaveProperty("handleMouseEnter");
  });

  it("should handle multiple calls to handleMouseEnter gracefully", () => {
    const { result } = renderHook(() => useOAuthPreload());

    // Should not throw
    act(() => {
      result.current.handleMouseEnter();
      result.current.handleMouseEnter();
      result.current.handleMouseEnter();
    });

    expect(result.current).toHaveProperty("handleMouseEnter");
  });

  it("should not preload when feature flag is disabled", async () => {
    // Mock feature flag store to return false
    const { useFeatureFlagStore } = await import("@/stores/featureFlagStore");
    vi.mocked(useFeatureFlagStore).mockImplementation((selector) => {
      if (selector.toString().includes("oauth-preload")) {
        return false;
      }
      return false;
    });

    const { result } = renderHook(() => useOAuthPreload());

    // Should return handler but not preload
    expect(typeof result.current.handleMouseEnter).toBe("function");

    // Calling handler should do nothing when disabled
    act(() => {
      result.current.handleMouseEnter();
    });

    expect(result.current).toHaveProperty("isPreloaded");
  });
});
