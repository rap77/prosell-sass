import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MainContentWrapper } from "./MainContentWrapper";
import { useLayoutStore } from "@/lib/stores/layoutStore";

vi.mock("@/lib/stores/layoutStore");

describe("MainContentWrapper", () => {
  const mockToggleMobileDrawer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useLayoutStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      sidebarCollapsed: false,
      toggleMobileDrawer: mockToggleMobileDrawer,
    });
  });

  it("should render children correctly", () => {
    render(
      <MainContentWrapper>
        <div>Test Content</div>
      </MainContentWrapper>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should show hamburger menu button on mobile", () => {
    render(
      <MainContentWrapper>
        <div>Content</div>
      </MainContentWrapper>,
    );

    const hamburger = screen.getByLabelText(/open menu/i);
    expect(hamburger).toBeInTheDocument();

    // Should be hidden on desktop (md:hidden)
    expect(hamburger).toHaveClass("md:hidden");
  });

  it("should have minimum 44px touch target (spec: ui-ux-pro-max)", () => {
    render(
      <MainContentWrapper>
        <div>Content</div>
      </MainContentWrapper>,
    );

    const hamburger = screen.getByLabelText(/open menu/i);

    // h-11 w-11 = 44px x 44px (Tailwind)
    expect(hamburger).toHaveClass("h-11", "w-11");
  });

  it("should be positioned at top-left with z-50 (spec requirement)", () => {
    render(
      <MainContentWrapper>
        <div>Content</div>
      </MainContentWrapper>,
    );

    const hamburger = screen.getByLabelText(/open menu/i);

    // Fixed positioning, top-left, z-50 (above drawer z-40)
    expect(hamburger).toHaveClass("fixed", "left-4", "top-4", "z-50");
  });

  it("should toggle mobile drawer when clicked", async () => {
    const user = userEvent.setup();

    render(
      <MainContentWrapper>
        <div>Content</div>
      </MainContentWrapper>,
    );

    const hamburger = screen.getByLabelText(/open menu/i);
    await user.click(hamburger);

    expect(mockToggleMobileDrawer).toHaveBeenCalledOnce();
  });

  it("should apply correct margin based on sidebar state", () => {
    const { rerender } = render(
      <MainContentWrapper>
        <div>Content</div>
      </MainContentWrapper>,
    );

    // Find wrapper by looking for the parent of children
    const wrapper = screen.getByText("Content").parentElement;

    // Sidebar expanded: ml-64
    expect(wrapper).toHaveClass("md:ml-64");

    // Sidebar collapsed: ml-16
    (useLayoutStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      sidebarCollapsed: true,
      toggleMobileDrawer: mockToggleMobileDrawer,
    });

    rerender(
      <MainContentWrapper>
        <div>Content</div>
      </MainContentWrapper>,
    );

    expect(wrapper).toHaveClass("md:ml-16");
  });
});
