import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

describe("useDebouncedValue", () => {
  it("returns the initial value immediately, then updates after the delay", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: "a" } },
    );
    expect(result.current).toBe("a");
    rerender({ value: "b" });
    expect(result.current).toBe("a"); // not yet
    await waitFor(() => expect(result.current).toBe("b"));
  });
});
