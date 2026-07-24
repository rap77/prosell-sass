import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileNav } from "@/components/layout/MobileNav";

// Mock Next.js usePathname
vi.mock("next/navigation", () => ({
  usePathname: () => "/catalog",
}));

// Mock useLayoutStore
const { mockUseLayoutStore } = vi.hoisted(() => ({
  mockUseLayoutStore: vi.fn(),
}));

vi.mock("@/lib/stores/layoutStore", () => ({
  useLayoutStore: mockUseLayoutStore,
}));

// Setup default store state
mockUseLayoutStore.mockImplementation((selector?: (s: any) => any) => {
  const state = {
    toggleMobileDrawer: vi.fn(),
    mobileDrawerOpen: false,
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
  };
  if (!selector) return state;
  return selector(state);
});

describe("MobileNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 4 bottom navigation icons", () => {
    render(<MobileNav />);

    expect(screen.getByText("Catálogo")).toBeInTheDocument();
    expect(screen.getByText("Publicar")).toBeInTheDocument();
    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(screen.getByText("Más")).toBeInTheDocument();
  });

  it("has 44x44px touch targets (Fitts's Law)", () => {
    const { container } = render(<MobileNav />);

    // Check icon container dimensions (h-11 w-11 = 44px, meets minimum)
    const iconContainers = container.querySelectorAll(".h-11.w-11");
    expect(iconContainers.length).toBeGreaterThan(0);
    iconContainers.forEach((icon) => {
      expect(icon).toHaveClass("h-11", "w-11");
    });
  });

  it("highlights active route", () => {
    const { container } = render(<MobileNav />);

    const catalogButton = screen.getByLabelText("Catálogo");
    // The active styles are on the icon container div, not the link itself
    const iconContainer = catalogButton.querySelector(".h-11.w-11");
    expect(iconContainer).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("does not highlight inactive routes", () => {
    const { container } = render(<MobileNav />);

    const publishButton = screen.getByLabelText("Publicar");
    // The inactive styles are on the icon container div
    const iconContainer = publishButton.querySelector(".h-11.w-11");
    expect(iconContainer).toHaveClass("text-muted-foreground");
  });

  it("is fixed at bottom of viewport", () => {
    const { container } = render(<MobileNav />);

    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("fixed", "bottom-0");
  });

  it("has z-index for overlay", () => {
    const { container } = render(<MobileNav />);

    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("z-50");
  });

  it("has border-top styling", () => {
    const { container } = render(<MobileNav />);

    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("border-t");
  });

  it("has correct height (h-16 = 64px)", () => {
    const { container } = render(<MobileNav />);

    // The h-16 class is on the inner container div
    const innerContainer = container.querySelector("nav > div");
    expect(innerContainer).toHaveClass("h-16");
  });

  it("is hidden on desktop (md:hidden)", () => {
    const { container } = render(<MobileNav />);

    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("md:hidden");
  });

  it('has aria-current="page" on active route', () => {
    render(<MobileNav />);

    const catalogButton = screen.getByLabelText("Catálogo");
    expect(catalogButton).toHaveAttribute("aria-current", "page");
  });

  it("has proper aria-label for accessibility", () => {
    render(<MobileNav />);

    expect(screen.getByLabelText("Catálogo")).toBeInTheDocument();
    expect(screen.getByLabelText("Publicar")).toBeInTheDocument();
    expect(screen.getByLabelText("Leads")).toBeInTheDocument();
    expect(screen.getByLabelText("Más")).toBeInTheDocument();
  });
});
