import { describe, it, expect, beforeEach } from "vitest";
import { useBreadcrumbStore } from "./breadcrumbStore";

/**
 * breadcrumbStore — unit tests.
 *
 * The store lets detail pages override a dynamic path segment (e.g. a UUID)
 * with the real entity name, keyed by the raw segment value. The Header
 * prefers an override when present and falls back to the URL resolver.
 */
describe("breadcrumbStore", () => {
  beforeEach(() => {
    useBreadcrumbStore.setState({ labels: {} });
  });

  it("starts with no labels", () => {
    expect(useBreadcrumbStore.getState().labels).toEqual({});
  });

  it("registers a label for a segment", () => {
    useBreadcrumbStore.getState().setLabel("uuid-1", "Toyota Corolla 2020");
    expect(useBreadcrumbStore.getState().labels["uuid-1"]).toBe(
      "Toyota Corolla 2020",
    );
  });

  it("overwrites an existing label for the same segment", () => {
    const { setLabel } = useBreadcrumbStore.getState();
    setLabel("uuid-1", "Old");
    setLabel("uuid-1", "New");
    expect(useBreadcrumbStore.getState().labels["uuid-1"]).toBe("New");
  });

  it("clears a label", () => {
    const { setLabel, clearLabel } = useBreadcrumbStore.getState();
    setLabel("uuid-1", "Toyota");
    clearLabel("uuid-1");
    expect(useBreadcrumbStore.getState().labels["uuid-1"]).toBeUndefined();
  });

  it("treats clearing a missing segment as a no-op", () => {
    const before = useBreadcrumbStore.getState().labels;
    useBreadcrumbStore.getState().clearLabel("does-not-exist");
    expect(useBreadcrumbStore.getState().labels).toEqual(before);
  });

  it("keeps other labels when clearing one", () => {
    const { setLabel, clearLabel } = useBreadcrumbStore.getState();
    setLabel("a", "A");
    setLabel("b", "B");
    clearLabel("a");
    expect(useBreadcrumbStore.getState().labels).toEqual({ b: "B" });
  });
});
