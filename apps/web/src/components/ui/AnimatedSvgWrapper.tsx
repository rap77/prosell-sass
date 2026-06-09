/**
 * AnimatedSvgWrapper Component
 *
 * High-performance SVG animation wrapper using hardware-accelerated CSS transforms.
 * Guarantees smooth 60fps animations by leveraging GPU acceleration.
 *
 * Performance Techniques:
 * - translateZ(0) forces GPU layer creation
 * - willChange hints to browser for optimization
 * - CSS-only animations (no JS frame loops)
 * - transform and opacity only (paint-free)
 *
 * React 19 + React Compiler: No manual memoization needed.
 */
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";

// ============================================
// TYPES
// ============================================

export type AnimationType = "fadeIn" | "slideUp" | "scaleIn";

export interface AnimatedSvgWrapperProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "ref"
> {
  /** Animation type to apply */
  animation?: AnimationType;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Animation delay in milliseconds */
  delay?: number;
  /** Child elements (SVG, icons, etc.) */
  children: React.ReactNode;
}

// ============================================
// STYLES
// ============================================

interface WrapperStyle extends React.CSSProperties {
  animation: string;
  transform: string;
  willChange: string;
}

const createAnimationStyle = (
  animation: AnimationType,
  duration: number,
  delay: number,
): WrapperStyle => ({
  animation: `${animation} ${duration}ms ease-out ${delay}ms`,
  // Force GPU layer creation for hardware acceleration
  transform: "translateZ(0)",
  // Hint to browser for optimization
  willChange: "transform, opacity",
});

// ============================================
// MAIN COMPONENT
// ============================================

interface AnimatedSvgWrapperWithRefProps extends AnimatedSvgWrapperProps {
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * AnimatedSvgWrapper component with proper ref forwarding.
 *
 * React 19 + React Compiler: No manual memoization needed.
 * Uses forwardRef to properly forward refs to the underlying div element.
 */
export const AnimatedSvgWrapper = React.forwardRef<
  HTMLDivElement,
  AnimatedSvgWrapperProps
>(
  (
    {
      animation = "fadeIn",
      duration = 300,
      delay = 0,
      children,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    // Feature flag check
    const useSvgWrapper = useFeatureFlagStore((state) =>
      state.get("svg-wrapper", true),
    );

    // If feature flag is disabled, render without animation
    if (!useSvgWrapper) {
      return (
        <div ref={forwardedRef} className={className} {...props}>
          {children}
        </div>
      );
    }

    const style = createAnimationStyle(animation, duration, delay);

    return (
      <div
        ref={forwardedRef}
        className={cn("inline-block", className)}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  },
);

// Display name for debugging
AnimatedSvgWrapper.displayName = "AnimatedSvgWrapper";
