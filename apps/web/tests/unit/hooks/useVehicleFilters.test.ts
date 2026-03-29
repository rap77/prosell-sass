/**
 * useVehicleFilters Hook Tests
 *
 * Tests vehicle filter state management with URL params
 * Phase 09: Verifies useCallback removal (React Compiler handles optimization)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVehicleFilters } from "@/lib/hooks/useVehicleFilters";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key),
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("useVehicleFilters", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
  });

  it("should return initial filters", () => {
    const { result } = renderHook(() => useVehicleFilters());

    expect(result.current.filters).toEqual({
      search: "",
      brand: [],
      priceRange: [0, 100000],
      status: [],
      year: [2010, 2026],
    });
  });

  it("should return setFilter function", () => {
    const { result } = renderHook(() => useVehicleFilters());

    expect(typeof result.current.setFilter).toBe("function");
  });

  it("should return clearAllFilters function", () => {
    const { result } = renderHook(() => useVehicleFilters());

    expect(typeof result.current.clearAllFilters).toBe("function");
  });

  it("should call router.push when setFilter is called", () => {
    const { result } = renderHook(() => useVehicleFilters());

    act(() => {
      result.current.setFilter("search", "toyota");
    });

    expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
  });

  it("should call router.push with array filter", () => {
    const { result } = renderHook(() => useVehicleFilters());

    act(() => {
      result.current.setFilter("brand", ["toyota", "honda"]);
    });

    expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
  });

  it("should call router.push when clearing array filter", () => {
    mockSearchParams.set("brand", "toyota,honda");

    const { result } = renderHook(() => useVehicleFilters());

    act(() => {
      result.current.setFilter("brand", []);
    });

    expect(mockPush).toHaveBeenCalled();
  });

  it("should call router.push when clearing filter", () => {
    mockSearchParams.set("search", "toyota");

    const { result } = renderHook(() => useVehicleFilters());

    act(() => {
      result.current.setFilter("search", "");
    });

    expect(mockPush).toHaveBeenCalled();
  });

  it("should call router.push to /catalog when clearing all filters", () => {
    mockSearchParams.set("search", "toyota");
    mockSearchParams.set("brand", "honda");

    const { result } = renderHook(() => useVehicleFilters());

    act(() => {
      result.current.clearAllFilters();
    });

    expect(mockPush).toHaveBeenCalledWith("/catalog", { scroll: false });
  });

  it("should parse search params correctly", () => {
    mockSearchParams.set("search", "camry");
    mockSearchParams.set("brand", "toyota,honda");
    mockSearchParams.set("minPrice", "10000");
    mockSearchParams.set("maxPrice", "50000");
    mockSearchParams.set("status", "active,sold");
    mockSearchParams.set("minYear", "2015");
    mockSearchParams.set("maxYear", "2020");

    const { result } = renderHook(() => useVehicleFilters());

    expect(result.current.filters).toEqual({
      search: "camry",
      brand: ["toyota", "honda"],
      priceRange: [10000, 50000],
      status: ["active", "sold"],
      year: [2015, 2020],
    });
  });

  it("should use defaults when params are missing", () => {
    mockSearchParams.set("search", "test");

    const { result } = renderHook(() => useVehicleFilters());

    expect(result.current.filters).toEqual({
      search: "test",
      brand: [],
      priceRange: [0, 100000],
      status: [],
      year: [2010, 2026],
    });
  });

  it("should handle multiple filter updates", () => {
    const { result } = renderHook(() => useVehicleFilters());

    act(() => {
      result.current.setFilter("search", "toyota");
    });

    expect(mockPush).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setFilter("brand", ["toyota"]);
    });

    expect(mockPush).toHaveBeenCalledTimes(2);
  });
});
