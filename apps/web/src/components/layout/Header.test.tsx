/**
 * Header.test.tsx
 *
 * TDD tests for Header component covering two regressions:
 *
 * Bug 1 — Breadcrumb humanization
 *   When the route contains a UUID (e.g. /catalog/<uuid>/edit) the breadcrumb
 *   used to render the raw UUID. It must now render a humanized label
 *   ("Detalle", "Editar", "Inicio", "Catálogo", ...).
 *
 * Bug 2 — User menu navigation
 *   The Profile and Settings items in the user dropdown had no onClick / no
 *   href — clicking them did nothing. They must now render an <a> (or
 *   compatible Link) pointing at /profile and /settings respectively.
 *
 * Notes on mocking strategy:
 *   - The global mock in tests/setup.tsx renders <DropdownMenuItem> as a
 *     <button>. We override it locally so that asChild + <Link> pass through
 *     and we can assert the rendered <a href="..."> directly.
 *   - We mock next/navigation with a controllable usePathname and a
 *     useRouter stub whose `push` is spied.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- next/navigation ----
const mockUsePathname = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// ---- useAuth ----
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      role: "Seller",
      is_email_verified: true,
      is_2fa_enabled: false,
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn(),
    clearError: vi.fn(),
    userId: "user-1",
    userEmail: "ada@example.com",
    userFullName: "Ada Lovelace",
    userRole: "Seller",
    isEmailVerified: true,
    is2FAEnabled: false,
  }),
}));

// ---- Heavy child components rendered conditionally by Header ----
vi.mock("@/components/teams/TeamSwitcher", () => ({
  TeamSwitcher: () => <div data-testid="team-switcher" />,
}));
vi.mock("@/components/layout/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));
vi.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

// ---- Local dropdown-menu mock that honours asChild ----
//
// The default global mock from tests/setup.tsx renders DropdownMenuItem as
// a <button>, which would swallow our <Link> child. We override here so the
// href can be asserted on the underlying anchor.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    asChild,
    ...props
  }: {
    children?: React.ReactNode;
    asChild?: boolean;
    [key: string]: unknown;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        "data-testid": "dropdown-trigger",
      } as React.HTMLAttributes<HTMLElement>);
    }
    return (
      <button data-testid="dropdown-trigger" {...props}>
        {children}
      </button>
    );
  },
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dropdown-content" role="menu">
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    asChild,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    asChild?: boolean;
    className?: string;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        "data-testid": "dropdown-item",
        role: "menuitem",
        className,
      } as React.HTMLAttributes<HTMLElement>);
    }
    return (
      <button
        data-testid="dropdown-item"
        className={className}
        onClick={onClick}
        role="menuitem"
      >
        {children}
      </button>
    );
  },
  DropdownMenuLabel: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

import { Header } from "./Header";
import { useBreadcrumbStore } from "@/lib/stores/breadcrumbStore";

const SAMPLE_UUID = "B878d633-e2d6-4064-84c2-74a63dfed92a";

describe("Header — breadcrumb humanization", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    useBreadcrumbStore.setState({ labels: {} });
  });

  it("renders only 'Inicio' on the dashboard root", () => {
    mockUsePathname.mockReturnValue("/dashboard");

    render(<Header />);

    const nav = screen.getByRole("navigation");
    // "Home" must NOT appear — we switched to "Inicio"
    expect(within(nav).queryByText("Home")).not.toBeInTheDocument();
    expect(within(nav).getByText("Inicio")).toBeInTheDocument();
  });

  it("renders 'Inicio / Catálogo' for /dashboard/catalog", () => {
    mockUsePathname.mockReturnValue("/dashboard/catalog");

    render(<Header />);

    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Inicio")).toBeInTheDocument();
    expect(within(nav).getByText("Catálogo")).toBeInTheDocument();
  });

  it("renders 'Inicio / Catálogo / Detalle' for /catalog/<uuid> (no raw UUID)", () => {
    mockUsePathname.mockReturnValue(`/dashboard/catalog/${SAMPLE_UUID}`);

    const { container } = render(<Header />);

    // Raw UUID must NOT appear anywhere in the document
    expect(container.textContent).not.toContain(SAMPLE_UUID);
    expect(container.innerHTML).not.toContain(SAMPLE_UUID);

    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Inicio")).toBeInTheDocument();
    expect(within(nav).getByText("Catálogo")).toBeInTheDocument();
    expect(within(nav).getByText("Detalle")).toBeInTheDocument();
  });

  it("renders 'Inicio / Catálogo / Detalle / Editar' for /catalog/<uuid>/edit", () => {
    mockUsePathname.mockReturnValue(`/dashboard/catalog/${SAMPLE_UUID}/edit`);

    const { container } = render(<Header />);

    expect(container.textContent).not.toContain(SAMPLE_UUID);

    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Inicio")).toBeInTheDocument();
    expect(within(nav).getByText("Catálogo")).toBeInTheDocument();
    expect(within(nav).getByText("Detalle")).toBeInTheDocument();
    expect(within(nav).getByText("Editar")).toBeInTheDocument();
  });

  it("prefers a breadcrumb override (real entity name) over generic 'Detalle'", () => {
    mockUsePathname.mockReturnValue(`/dashboard/catalog/${SAMPLE_UUID}`);
    // A detail page registers the real product title for the id segment.
    useBreadcrumbStore.getState().setLabel(SAMPLE_UUID, "Toyota Corolla 2020");

    const { container } = render(<Header />);

    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Toyota Corolla 2020")).toBeInTheDocument();
    // The generic fallback must NOT be used when an override exists.
    expect(within(nav).queryByText("Detalle")).not.toBeInTheDocument();
    // And the raw UUID must never leak.
    expect(container.textContent).not.toContain(SAMPLE_UUID);
  });

  it("shows the real entity name then 'Editar' on the edit route", () => {
    mockUsePathname.mockReturnValue(`/dashboard/catalog/${SAMPLE_UUID}/edit`);
    useBreadcrumbStore.getState().setLabel(SAMPLE_UUID, "Toyota Corolla 2020");

    const { container } = render(<Header />);

    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Toyota Corolla 2020")).toBeInTheDocument();
    expect(within(nav).getByText("Editar")).toBeInTheDocument();
    expect(within(nav).queryByText("Detalle")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain(SAMPLE_UUID);
  });
});

describe("Header — user menu navigation", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUsePathname.mockReturnValue("/dashboard");
    mockPush.mockReset();
    useBreadcrumbStore.setState({ labels: {} });
  });

  it("renders the user menu trigger button", () => {
    render(<Header />);

    // The user dropdown trigger shows the initials "AL" for Ada Lovelace
    expect(screen.getAllByText("AL").length).toBeGreaterThan(0);
  });

  it("renders the Profile menu item with href='/profile'", () => {
    render(<Header />);

    // Find the Profile link by role+name (a <a> with href to /profile)
    const profileLink = screen.getByRole("menuitem", { name: /profile/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("renders the Settings menu item with href='/settings'", () => {
    render(<Header />);

    const settingsLink = screen.getByRole("menuitem", { name: /settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("navigates when Profile is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const profileLink = screen.getByRole("menuitem", { name: /profile/i });
    // Clicking a real <a href="..."> triggers a navigation; in jsdom the
    // anchor has its href, so we assert the href and that clicking the
    // (anchor) element does not throw.
    await user.click(profileLink);

    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("navigates when Settings is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const settingsLink = screen.getByRole("menuitem", { name: /settings/i });
    await user.click(settingsLink);

    expect(settingsLink).toHaveAttribute("href", "/settings");
  });
});
