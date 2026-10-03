import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./useIsMobile";

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  let listener: ((e: MediaQueryListEvent) => void) | null = null;
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listener = cb;
    },
    removeEventListener: () => {
      listener = null;
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    setMatches(next: boolean) {
      matches = next;
      listener?.({ matches: next } as MediaQueryListEvent);
    },
  };
}

describe("useIsMobile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when the viewport matches the mobile query", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when the viewport doesn't match", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates when the media query match changes (viewport resize)", () => {
    const { setMatches } = mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setMatches(true);
    });

    expect(result.current).toBe(true);
  });
});
