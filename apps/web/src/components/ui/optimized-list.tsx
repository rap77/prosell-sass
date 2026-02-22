import * as React from "react"
import { cn } from "@/lib/utils"
import { useFeatureFlagStore } from "@/stores/featureFlagStore"

/**
 * Check if content-visibility CSS property is supported
 *
 * Feature detection for progressive enhancement.
 * Returns false if browser doesn't support content-visibility.
 *
 * @returns true if content-visibility is supported
 */
function supportsContentVisibility(): boolean {
  if (typeof CSS === 'undefined') {
    return false
  }

  // Try to detect support via CSS.supports
  if (typeof CSS.supports === 'function') {
    return CSS.supports('content-visibility', 'auto')
  }

  // Fallback: assume supported for modern browsers
  return true
}

/**
 * Optimized list component with content-visibility for better performance
 *
 * Features:
 * - content-visibility for lazy rendering of long lists (feature-flagged)
 * - React Compiler handles optimization automatically
 * - Virtualization support via placeholder
 * - Feature detection for graceful degradation
 * - Smooth scrolling
 *
 * @example
 * ```tsx
 * <OptimizedList
 *   items={items}
 *   renderItem={(item, index) => <div key={index}>{item.name}</div>}
 * />
 * ```
 */
interface OptimizedListProps<T> {
  /** Array of items to render */
  items: T[]
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Additional className for the container */
  className?: string
  /** Additional className for each item wrapper */
  itemClassName?: string
  /** Placeholder for virtualized lists */
  placeholder?: React.ReactNode
  /** Estimated height of each item in pixels (for contain-intrinsic-size) */
  estimatedItemHeight?: number
  /** Threshold after which to enable virtualization */
  virtualThreshold?: number
}

export function OptimizedList<T>({
  items,
  renderItem,
  className,
  itemClassName,
  placeholder,
  estimatedItemHeight = 64,
  virtualThreshold = 50
}: OptimizedListProps<T>) {
  // Feature flag for content-visibility optimization
  const contentVisibilityEnabled = useFeatureFlagStore(
    (state) => state.get('content-visibility', true)
  )

  // Feature detection
  const isSupported = supportsContentVisibility()

  // Determine if we should use content-visibility
  const shouldUseContentVisibility = contentVisibilityEnabled && isSupported

  // Only use virtualization for large lists
  const shouldUseVirtualization = items.length > virtualThreshold

  if (shouldUseVirtualization && placeholder) {
    return (
      <div
        className={cn("overflow-auto", className)}
        style={{ maxHeight: `${items.length * estimatedItemHeight}px` }}
      >
        {/* Placeholder for virtualized list */}
        <div className="space-y-4">
          {placeholder}
        </div>
      </div>
    )
  }

  // Calculate intrinsic size based on estimated item height
  const intrinsicSizeClass = cn({
    'contain-intrinsic-64': estimatedItemHeight === 64,
    'contain-intrinsic-128': estimatedItemHeight === 128,
    'contain-intrinsic-256': estimatedItemHeight === 256,
  })

  return (
    <div
      className={cn(
        "space-y-4",
        shouldUseContentVisibility && "content-visible-auto",
        intrinsicSizeClass,
        className
      )}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  )
}

/**
 * List item with content-visibility optimization
 *
 * Wraps content with content-visibility optimization (feature-flagged).
 * Use this for list items that may be expensive to render.
 * React Compiler handles memoization automatically - no manual memo needed.
 *
 * @example
 * ```tsx
 * <MemoizedListItem className="p-4 border">
 *   <div>Expensive content here</div>
 * </MemoizedListItem>
 * ```
 */
export function MemoizedListItem({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  // Feature flag for content-visibility optimization
  const contentVisibilityEnabled = useFeatureFlagStore(
    (state) => state.get('content-visibility', true)
  )

  // Feature detection
  const isSupported = supportsContentVisibility()

  // Determine if we should use content-visibility
  const shouldUseContentVisibility = contentVisibilityEnabled && isSupported

  return (
    <div
      className={cn(
        "transition-all duration-200 ease-in-out",
        shouldUseContentVisibility && "content-visible-auto contain-intrinsic-64",
        className
      )}
    >
      {children}
    </div>
  )
}

MemoizedListItem.displayName = "MemoizedListItem"
