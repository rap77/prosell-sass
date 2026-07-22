/**
 * Button Touch Targets Tests (TDD)
 * Sprint 0 - Task 6: Touch Gestures
 *
 * WCAG 2.2 Level AA requires min 44x44px touch targets
 * https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "./button";

describe("Button Touch Targets", () => {
  it("should have 44px height for touch variant", () => {
    const { container } = render(<Button size="touch">Tap me</Button>);
    const button = container.querySelector("button");

    expect(button).toBeTruthy();
    // h-11 = 44px (11 * 4px in Tailwind)
    expect(button?.className).toContain("h-11");
  });

  it("should have 44px width and height for touch-icon variant", () => {
    const { container } = render(<Button size="touch-icon">🔍</Button>);
    const button = container.querySelector("button");

    expect(button).toBeTruthy();
    // h-11 = 44px, w-11 = 44px (11 * 4px in Tailwind)
    expect(button?.className).toContain("h-11");
    expect(button?.className).toContain("w-11");
  });

  it("should render with touch class names", () => {
    const { container } = render(<Button size="touch">Touch me</Button>);
    const button = container.querySelector("button");

    expect(button?.className).toContain("h-11"); // Tailwind class for 44px (11 * 4px)
  });

  it("should render touch-icon with square dimensions", () => {
    const { container } = render(<Button size="touch-icon">X</Button>);
    const button = container.querySelector("button");

    // Should have both width and height classes
    expect(button?.className).toMatch(/h-11/);
    expect(button?.className).toMatch(/w-11/);
  });

  it("should work with all variants", () => {
    const variants = [
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ] as const;

    variants.forEach((variant) => {
      const { container } = render(
        <Button variant={variant} size="touch">
          Test
        </Button>,
      );
      const button = container.querySelector("button");

      // All variants with size="touch" should have h-11 (44px)
      expect(button?.className).toContain("h-11");
    });
  });

  it("should maintain accessibility with proper padding", () => {
    const { container } = render(<Button size="touch">Long text here</Button>);
    const button = container.querySelector("button");

    expect(button).toBeTruthy();
    // Touch buttons should have horizontal padding for text breathing room
    expect(button?.className).toMatch(/px-/);
  });
});
