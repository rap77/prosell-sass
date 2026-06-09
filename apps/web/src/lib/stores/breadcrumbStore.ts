import { create } from "zustand";

/**
 * Breadcrumb override store.
 *
 * The Header builds its breadcrumb trail from the URL via
 * `formatBreadcrumbLabel` (see `lib/breadcrumb.ts`). That resolver is
 * URL-only: it cannot know the human name behind a dynamic `[id]` segment,
 * so it falls back to the generic label "Detalle".
 *
 * Detail pages — which have ALREADY fetched the entity — push the real name
 * here, keyed by the raw path segment (the id itself). The Header prefers an
 * override when present and falls back to the URL resolver otherwise. This
 * is graceful degradation: if no page registers an override, the breadcrumb
 * still renders "Detalle" instead of leaking a raw UUID.
 *
 * Overrides are intentionally NOT persisted (no `persist` middleware): they
 * are tied to the page currently mounted and are cleared on unmount.
 */
interface BreadcrumbState {
  /** Map of raw path segment → human label (e.g. "<uuid>" → "Toyota Corolla"). */
  labels: Record<string, string>;

  /** Register a human label for a path segment. */
  setLabel: (segment: string, label: string) => void;

  /** Remove a previously registered label (call on unmount). */
  clearLabel: (segment: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  labels: {},

  setLabel: (segment, label) =>
    set((state) => ({ labels: { ...state.labels, [segment]: label } })),

  clearLabel: (segment) =>
    set((state) => {
      if (!(segment in state.labels)) return state;
      const next = { ...state.labels };
      delete next[segment];
      return { labels: next };
    }),
}));
