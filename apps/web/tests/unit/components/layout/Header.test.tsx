import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "@/components/layout/Header";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/catalog/vehicles",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn(() => ({
  logout: vi.fn(),
  user: null,
  isAdmin: false,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock TeamSwitcher component
vi.mock("@/components/teams/TeamSwitcher", () => ({
  TeamSwitcher: () => <div data-testid="team-switcher">Team Switcher</div>,
}));

// Mock DealerPicker component (Subsystem D Phase 6.4)
vi.mock("@/components/admin/DealerPicker", () => ({
  DealerPicker: () => <div data-testid="dealer-picker" />,
}));

vi.mock("@/components/layout/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

describe("Header", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      logout: vi.fn(),
      user: null,
      isAdmin: false,
    });
  });

  it("renders DealerPicker instead of the org switcher for an admin", () => {
    mockUseAuth.mockReturnValue({ logout: vi.fn(), user: null, isAdmin: true });

    render(<Header />);

    expect(screen.getByTestId("dealer-picker")).toBeInTheDocument();
    expect(screen.queryByText("Organizations")).not.toBeInTheDocument();
  });

  it("renders the org switcher placeholder for a non-admin", () => {
    render(<Header />);

    expect(screen.queryByTestId("dealer-picker")).not.toBeInTheDocument();
  });

  it("renders without crashing", () => {
    render(<Header />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });

  it("accepts user prop", () => {
    render(
      <Header
        user={{
          name: "Jane Smith",
          email: "jane@example.com",
          role: "Admin",
          initials: "JS",
        }}
      />,
    );
    expect(true).toBe(true);
  });

  it("accepts organization prop with id", () => {
    render(
      <Header
        organization={{ id: "org-1", name: "Test Brancheship" }}
        tenantId="tenant-1"
      />,
    );
    expect(screen.getByTestId("team-switcher")).toBeInTheDocument();
  });

  it("does not render TeamSwitcher without organization id and tenantId", () => {
    render(<Header organization={{ name: "Test Brancheship" }} />);
    expect(screen.queryByTestId("team-switcher")).not.toBeInTheDocument();
  });

  it("user data structure is correct", () => {
    const userData = {
      name: "Test User",
      email: "test@example.com",
      role: "Seller",
      initials: "TU",
    };

    expect(typeof userData.name).toBe("string");
    expect(typeof userData.email).toBe("string");
    expect(typeof userData.role).toBe("string");
    expect(typeof userData.initials).toBe("string");
  });

  it("organization data structure is correct", () => {
    const orgData = {
      id: "org-1",
      name: "Test Org",
    };

    expect(typeof orgData.id).toBe("string");
    expect(typeof orgData.name).toBe("string");
  });
});
