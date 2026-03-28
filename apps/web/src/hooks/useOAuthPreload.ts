"use client";

/**
 * useOAuthPreload Hook
 *
 * Intent-based OAuth component preloading strategy.
 * Implements progressive enhancement with fallbacks.
 *
 * Strategy:
 * 1. Initial preload: Attempts to preload OAuth component on mount
 * 2. Hover retry: Retries preload on mouse enter if initial failed
 * 3. Click fallback: Normal loading on click if preload failed
 *
 * Performance benefits:
 * - Reduces perceived latency when user hovers OAuth buttons
 * - Graceful degradation if preload fails
 * - No blocking of initial page load
 *
 * React 19 + React Compiler: No manual memoization needed.
 *
 * @example
 * ```tsx
 * const { handleMouseEnter } = useOAuthPreload();
 * <div onMouseEnter={handleMouseEnter}>
 *   <OAuthButtons />
 * </div>
 * ```
 */

import { useEffect, useRef } from "react";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

export interface UseOAuthPreloadOptions {
  /**
   * OAuth component import path to preload
   * @default "@/components/auth/OAuthButtons"
   */
  importPath?: string;
}

export interface UseOAuthPreloadReturn {
  /**
   * Whether the OAuth component has been successfully preloaded
   */
  isPreloaded: boolean;
  /**
   * Handler to attach to parent container's onMouseEnter
   * Retries preload if initial attempt failed
   */
  handleMouseEnter: () => void;
}

// ============================================
// HOOK
// ============================================

/**
 * Intent-based OAuth preload hook
 *
 * Implements a three-tier preload strategy:
 * 1. Initial preload on mount (non-blocking)
 * 2. Retry on first mouse enter (if initial failed)
 * 3. Normal load on click (if preload failed)
 *
 * Uses feature flag "oauth-preload" for opt-in/opt-out.
 */
export function useOAuthPreload(
  options: UseOAuthPreloadOptions = {},
): UseOAuthPreloadReturn {
  const { importPath = "@/components/auth/OAuthButtons" } = options;

  // Feature flag check
  const usePreload = useFeatureFlagStore((state) =>
    state.get("oauth-preload", true),
  );

  // Track preload state
  const isPreloadedRef = useRef(false);
  const hasAttemptedRef = useRef(false);

  /**
   * Initial preload on mount
   * Runs once, non-blocking, silent failure
   */
  useEffect(() => {
    if (!usePreload || isPreloadedRef.current || hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;

    // Dynamic import with error handling
    import(/* webpackMode: "eager" */ importPath)
      .then(() => {
        isPreloadedRef.current = true;
        logger.info("[OAuth Preload] Initial preload successful");
      })
      .catch(() => {
        // Silent failure - will retry on hover
        logger.warn(
          "[OAuth Preload] Initial preload failed (will retry on hover)",
        );
      });
  }, [importPath, usePreload]);

  /**
   * Mouse enter retry handler
   * Retries preload if initial attempt failed
   */
  const handleMouseEnter = () => {
    if (!usePreload || isPreloadedRef.current) {
      return;
    }

    // Retry preload on hover
    import(/* webpackMode: "eager" */ importPath)
      .then(() => {
        isPreloadedRef.current = true;
        logger.info("[OAuth Preload] Hover retry successful");
      })
      .catch(() => {
        // Silent failure - will load on click
        logger.warn("[OAuth Preload] Hover retry failed (will load on click)");
      });
  };

  return {
    isPreloaded: isPreloadedRef.current,
    handleMouseEnter,
  };
}
