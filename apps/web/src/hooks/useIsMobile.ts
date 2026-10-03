"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's default `md` breakpoint (768px) — the same cutoff the
// rest of the app already uses for `md:` responsive classes, so "mobile"
// here means the same thing it means everywhere else in the UI.
const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * True when the viewport is narrower than Tailwind's `md` breakpoint.
 * `useSyncExternalStore` subscribes to `matchMedia` directly — no
 * state/effect pair to keep in sync, no hydration-mismatch handling needed
 * beyond the `false` server snapshot.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
