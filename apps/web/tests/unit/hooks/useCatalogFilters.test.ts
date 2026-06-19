import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCatalogFilters } from "@/lib/hooks/useCatalogFilters";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

describe("useCatalogFilters", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
  });

  it("writes a select filter as comma-joined param", () => {
    const { result } = renderHook(() =>
      useCatalogFilters([{ key: "make", filter_type: "select" }]),
    );
    act(() => result.current.setFilter("make", ["Toyota", "Honda"]));
    expect(mockPush).toHaveBeenCalledWith("?make=Toyota%2CHonda", {
      scroll: false,
    });
  });

  it("reads range bounds from <key>_min/<key>_max", () => {
    mockSearchParams = new URLSearchParams("year_min=2015&year_max=2020");
    const { result } = renderHook(() =>
      useCatalogFilters([{ key: "year", filter_type: "range" }]),
    );
    expect(result.current.values.year_min).toBe("2015");
    expect(result.current.values.year_max).toBe("2020");
  });

  it("setFilters applies multiple keys atomically in a single push", () => {
    mockSearchParams = new URLSearchParams("year_min=2010&year_max=2026");
    const { result } = renderHook(() =>
      useCatalogFilters([{ key: "year", filter_type: "range" }]),
    );
    act(() =>
      result.current.setFilters({ year_min: "2012", year_max: "2025" }),
    );
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("?year_min=2012&year_max=2025", {
      scroll: false,
    });
  });

  it("two sequential setFilter calls clobber each other (documents why setFilters exists)", () => {
    mockSearchParams = new URLSearchParams("year_min=2010&year_max=2026");
    const { result } = renderHook(() =>
      useCatalogFilters([{ key: "year", filter_type: "range" }]),
    );
    act(() => {
      result.current.setFilter("year_min", "2012");
      result.current.setFilter("year_max", "2025");
    });
    // The second push is built from the same stale searchParams as the
    // first, so it silently drops the year_min update — this is why
    // multi-key updates (e.g. a range slider) must use setFilters instead.
    expect(mockPush).toHaveBeenLastCalledWith("?year_min=2010&year_max=2025", {
      scroll: false,
    });
  });
});
