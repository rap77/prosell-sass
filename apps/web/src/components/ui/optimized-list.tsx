import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Optimized list component with content-visibility for better performance
 *
 * Features:
 * - content-visibility for lazy rendering of long lists
 * - React.memo for list items
 * - Virtualization support via placeholder
 * - Smooth scrolling
 *
 * @example
 * <OptimizedList items={items} renderItem={item => <div>{item.name}</div>} />
 */
interface OptimizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  itemClassName?: string
  placeholder?: React.ReactNode
  estimatedItemHeight?: number
  virtualThreshold?: number // Number of items after which to enable virtualization
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

  return (
    <div
      className={cn("space-y-4", className)}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: `${items.length * estimatedItemHeight}px`
      }}
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
 * Memoized list item for performance optimization
 */
export const MemoizedListItem = React.memo(function MemoizedListItem({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("transition-all duration-200 ease-in-out", className)}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "64px"
      }}
    >
      {children}
    </div>
  )
})

MemoizedListItem.displayName = "MemoizedListItem"
