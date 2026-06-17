/**
 * ErrorState — catalog page error fallback.
 *
 * Spec: T11 post-audit cleanup. The retry button used to call
 * `window.location.reload()` (full page reload — drops query cache, loses
 * client-side state, slow). The fix is to thread an `onRetry` callback
 * from the parent so the call goes through TanStack Query's
 * `useInfiniteProducts().refetch()` instead — fast, preserves state,
 * preserves URL/scroll.
 *
 * Tests:
 *   1. Renders the error message.
 *   2. Clicking "Reintentar" calls onRetry exactly once.
 *
 * Test 2 is the load-bearing one: a regression to `window.location.reload`
 * would NOT call the `onRetry` vi.fn, so test 2 is the discriminator
 * without needing to mock `window.location.reload` (which is read-only
 * in jsdom).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "@/app/(seller)/catalog/page";

describe("ErrorState", () => {
  it("renders the provided error message", () => {
    render(<ErrorState message="Network down" onRetry={() => {}} />);
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("calls onRetry when the Reintentar button is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState message="Boom" onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
