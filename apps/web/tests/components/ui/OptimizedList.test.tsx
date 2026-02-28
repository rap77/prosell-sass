/**
 * TDD: OptimizedList Component Tests
 * Phase 3: content-visibility optimization
 *
 * Tests include:
 * - Basic rendering with small lists
 * - Large list behavior (>50 items as per PRP)
 * - Feature flag functionality
 * - MemoizedListItem behavior
 * - Feature detection (graceful degradation)
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  OptimizedList,
  MemoizedListItem,
} from "@/components/ui/optimized-list";

// Mock featureFlagStore
vi.mock("@/stores", () => ({
  useFeatureFlagStore: vi.fn((selector) => {
    const state = {
      flags: {
        "content-visibility": true,
      } as Record<string, boolean>,
      get: vi.fn((flag: string, defaultValue = false) => {
        return state.flags[flag] ?? defaultValue;
      }),
      set: vi.fn(),
      reset: vi.fn(),
    };
    return selector(state);
  }),
}));

describe("OptimizedList Component", () => {
  const mockItems = [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
  ];

  const renderItem = (item: { id: number; name: string }) => (
    <div data-testid={`item-${item.id}`}>{item.name}</div>
  );

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering (Small Lists)", () => {
    it("should render all items in a small list", () => {
      render(<OptimizedList items={mockItems} renderItem={renderItem} />);

      expect(screen.getByTestId("item-1")).toBeInTheDocument();
      expect(screen.getByTestId("item-2")).toBeInTheDocument();
      expect(screen.getByTestId("item-3")).toBeInTheDocument();
    });

    it("should apply custom className to container", () => {
      const { container } = render(
        <OptimizedList
          items={mockItems}
          renderItem={renderItem}
          className="custom-class"
        />,
      );

      const listContainer = container.firstChild as HTMLElement;
      expect(listContainer).toHaveClass("custom-class");
    });

    it("should render empty list without errors", () => {
      const { container } = render(
        <OptimizedList items={[]} renderItem={renderItem} />,
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Large List Behavior (>50 items)", () => {
    // Create 75 items (>50 threshold) to test virtualization threshold
    const largeItems = Array.from({ length: 75 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
    }));

    it("should render all 75 items", () => {
      render(<OptimizedList items={largeItems} renderItem={renderItem} />);

      // Check first, middle, and last items
      expect(screen.getByTestId("item-1")).toBeInTheDocument();
      expect(screen.getByTestId("item-38")).toBeInTheDocument();
      expect(screen.getByTestId("item-75")).toBeInTheDocument();
    });

    it("should render all items when count equals threshold (50)", () => {
      const thresholdItems = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      render(<OptimizedList items={thresholdItems} renderItem={renderItem} />);

      expect(screen.getByTestId("item-1")).toBeInTheDocument();
      expect(screen.getByTestId("item-50")).toBeInTheDocument();
    });

    it("should display placeholder when virtualization enabled and placeholder provided", () => {
      const placeholder = <div data-testid="placeholder">Loading...</div>;

      const { container } = render(
        <OptimizedList
          items={largeItems}
          renderItem={renderItem}
          placeholder={placeholder}
          virtualThreshold={50}
        />,
      );

      // With placeholder, should show placeholder instead of items
      expect(screen.getByTestId("placeholder")).toBeInTheDocument();
    });

    it("should render items normally when no placeholder provided (even with >50 items)", () => {
      const { container } = render(
        <OptimizedList
          items={largeItems}
          renderItem={renderItem}
          virtualThreshold={50}
        />,
      );

      // Without placeholder, should render all items
      expect(screen.getByTestId("item-1")).toBeInTheDocument();
      expect(screen.getByTestId("item-75")).toBeInTheDocument();
    });

    it("should use custom virtualThreshold", () => {
      const mediumItems = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      const placeholder = <div data-testid="placeholder">Loading...</div>;

      render(
        <OptimizedList
          items={mediumItems}
          renderItem={renderItem}
          placeholder={placeholder}
          virtualThreshold={25}
        />,
      );

      // With threshold of 25, 30 items should trigger virtualization
      expect(screen.getByTestId("placeholder")).toBeInTheDocument();
    });
  });

  describe("content-visibility CSS Classes", () => {
    it("should apply content-visible-auto class when feature flag enabled", () => {
      const { container } = render(
        <OptimizedList items={mockItems} renderItem={renderItem} />,
      );

      const listContainer = container.firstChild as HTMLElement;
      expect(listContainer).toHaveClass("content-visible-auto");
    });

    it("should apply contain-intrinsic size class based on estimatedItemHeight", () => {
      const { container } = render(
        <OptimizedList
          items={mockItems}
          renderItem={renderItem}
          estimatedItemHeight={128}
        />,
      );

      const listContainer = container.firstChild as HTMLElement;
      expect(listContainer).toHaveClass("contain-intrinsic-128");
    });

    it("should apply contain-intrinsic-64 for default height", () => {
      const { container } = render(
        <OptimizedList items={mockItems} renderItem={renderItem} />,
      );

      const listContainer = container.firstChild as HTMLElement;
      expect(listContainer).toHaveClass("contain-intrinsic-64");
    });

    it("should apply contain-intrinsic-256 for large items", () => {
      const { container } = render(
        <OptimizedList
          items={mockItems}
          renderItem={renderItem}
          estimatedItemHeight={256}
        />,
      );

      const listContainer = container.firstChild as HTMLElement;
      expect(listContainer).toHaveClass("contain-intrinsic-256");
    });
  });

  describe("MemoizedListItem Component", () => {
    it("should render children correctly", () => {
      render(
        <MemoizedListItem>
          <div data-testid="child-content">Content</div>
        </MemoizedListItem>,
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <MemoizedListItem className="custom-item-class">
          <div>Content</div>
        </MemoizedListItem>,
      );

      const item = container.firstChild as HTMLElement;
      expect(item).toHaveClass("custom-item-class");
    });

    it("should apply content-visible-auto class when feature flag enabled", () => {
      const { container } = render(
        <MemoizedListItem>
          <div>Content</div>
        </MemoizedListItem>,
      );

      const item = container.firstChild as HTMLElement;
      expect(item).toHaveClass("content-visible-auto");
    });

    it("should apply contain-intrinsic-64 class", () => {
      const { container } = render(
        <MemoizedListItem>
          <div>Content</div>
        </MemoizedListItem>,
      );

      const item = container.firstChild as HTMLElement;
      expect(item).toHaveClass("contain-intrinsic-64");
    });

    it("should apply transition classes", () => {
      const { container } = render(
        <MemoizedListItem>
          <div>Content</div>
        </MemoizedListItem>,
      );

      const item = container.firstChild as HTMLElement;
      expect(item).toHaveClass("transition-all");
      expect(item).toHaveClass("duration-200");
      expect(item).toHaveClass("ease-in-out");
    });

    it("should have displayName for debugging", () => {
      expect(MemoizedListItem.displayName).toBe("MemoizedListItem");
    });
  });

  describe("Feature Detection", () => {
    it("should handle CSS.supports detection gracefully", () => {
      // This test verifies the feature detection function exists
      // and doesn't throw errors
      expect(() => {
        render(<OptimizedList items={mockItems} renderItem={renderItem} />);
      }).not.toThrow();
    });

    it("should render normally when content-visibility not supported (feature detection)", () => {
      // Mock CSS.supports to return false
      const originalCSS = global.CSS;
      global.CSS = {
        supports: vi.fn(() => false),
      } as any;

      const { container } = render(
        <OptimizedList items={mockItems} renderItem={renderItem} />,
      );

      // Should still render items
      expect(screen.getByTestId("item-1")).toBeInTheDocument();

      // Should NOT have content-visible-auto class when not supported
      const listContainer = container.firstChild as HTMLElement;
      expect(listContainer).not.toHaveClass("content-visible-auto");

      // Restore original CSS
      global.CSS = originalCSS;
    });
  });
});
