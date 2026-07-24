"use client";

/**
 * RefreshTrigger — Pull-to-refresh gesture for mobile-first UX
 *
 * - Drag down ≥80px → trigger refresh
 * - Visual progress indicator during pull
 * - Loading state during async refresh
 * - Mobile-only (<768px) via Tailwind responsive classes
 */

import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface RefreshTriggerProps {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
}

const PULL_THRESHOLD = 80; // ponytail: threshold in px for triggering refresh
const MAX_PULL = 120; // ponytail: max drag distance

export function RefreshTrigger({ onRefresh, children }: RefreshTriggerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  async function handleDragEnd(_: unknown, info: { offset: { y: number } }) {
    const dragDistance = info.offset.y;

    if (dragDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }

  function handleDrag(_: unknown, info: { offset: { y: number } }) {
    setPullDistance(info.offset.y);
  }

  const indicatorOpacity = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const indicatorRotation = (pullDistance / PULL_THRESHOLD) * 360;

  return (
    <div className="relative">
      {/* Refresh indicator - mobile only */}
      <div
        data-testid="refresh-indicator"
        className="absolute top-0 left-0 right-0 flex items-center justify-center h-16 pointer-events-none z-10 md:hidden"
        style={{
          opacity: isRefreshing ? 1 : indicatorOpacity,
        }}
      >
        <Loader2
          className="h-6 w-6"
          style={{
            color: "var(--ps-cyan)",
            transform: isRefreshing
              ? "none"
              : `rotate(${indicatorRotation}deg)`,
            animation: isRefreshing ? "spin 1s linear infinite" : "none",
          }}
        />
      </div>

      {/* Draggable content - gesture enabled on mobile only */}
      <motion.div
        data-testid="refresh-container"
        drag="y"
        dragConstraints={{ top: 0, bottom: MAX_PULL }}
        dragElastic={0.3}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        aria-label="Arrastrá hacia abajo para actualizar"
        animate={{ y: isRefreshing ? 0 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        // ponytail: md:hidden moved to parent wrapper would hide children; drag gesture disabled on desktop via CSS media query instead
        className="md:pointer-events-none md:select-none"
        style={{
          touchAction: "pan-y", // ponytail: mobile touch gesture only
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
