/**
 * AdminOrganizationDetailPage.test.tsx — Subsystem D Phase 6.7
 *
 * Shows the organization's info and links to its products page.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminOrganizationDetailPage from "./page";

// Mock useRequireAdmin (the component uses this, not useAuth)
const mockUseRequireAdmin = vi.fn();
vi.mock("@/hooks/useRequireAdmin", () => ({
  useRequireAdmin: () => mockUseRequireAdmin(),
}));

const mockUseOrganization = vi.fn();
const mockUseResendInvitation = vi.fn();
const mockUseUpdateOrganization = vi.fn();
const mockUseOrganizationBrokers = vi.fn();
const mockUseCreateOrganizationBroker = vi.fn();
const mockUseUpdateOrganizationBroker = vi.fn();
const mockUseDeleteOrganizationBroker = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganization: () => mockUseOrganization(),
  useResendOrganizationInvitation: () => mockUseResendInvitation(),
  useUpdateOrganization: () => mockUseUpdateOrganization(),
  useOrganizationBrokers: () => mockUseOrganizationBrokers(),
  useCreateOrganizationBroker: () => mockUseCreateOrganizationBroker(),
  useUpdateOrganizationBroker: () => mockUseUpdateOrganizationBroker(),
  useDeleteOrganizationBroker: () => mockUseDeleteOrganizationBroker(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ id: "organization-1" }),
}));

describe("AdminOrganizationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRequireAdmin.mockReturnValue(true);
    mockUseResendInvitation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseUpdateOrganization.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    // Broker hooks used by BrokerManager component
    mockUseOrganizationBrokers.mockReturnValue({ data: [], isLoading: false });
    mockUseCreateOrganizationBroker.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseUpdateOrganizationBroker.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeleteOrganizationBroker.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("returns null when not admin (useRequireAdmin handles redirect)", () => {
    mockUseRequireAdmin.mockReturnValue(false);
    mockUseOrganization.mockReturnValue({
      organization: undefined,
      isLoading: false,
      error: null,
    });

    const { container } = render(<AdminOrganizationDetailPage />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the organization's name and status", async () => {
    mockUseOrganization.mockReturnValue({
      organization: {
        id: "organization-1",
        name: "Organization One",
        status: "active",
      },
      isLoading: false,
      error: null,
    });

    render(<AdminOrganizationDetailPage />);

    expect(await screen.findByText("Organization One")).toBeInTheDocument();
    expect(screen.getByText(/activo/i)).toBeInTheDocument();
  });

  it("links to the organization's products page", async () => {
    mockUseOrganization.mockReturnValue({
      organization: {
        id: "organization-1",
        name: "Organization One",
        status: "active",
      },
      isLoading: false,
      error: null,
    });

    render(<AdminOrganizationDetailPage />);

    const link = await screen.findByRole("link", { name: /productos/i });
    expect(link).toHaveAttribute(
      "href",
      "/admin/organizations/organization-1/products",
    );
  });

  it("shows a not-found message when the organization doesn't exist", async () => {
    mockUseOrganization.mockReturnValue({
      organization: undefined,
      isLoading: false,
      error: null,
    });

    render(<AdminOrganizationDetailPage />);

    expect(await screen.findByText(/no encontrad/i)).toBeInTheDocument();
  });

  it("does not show the resend-invitation button when the organization is active", async () => {
    mockUseOrganization.mockReturnValue({
      organization: {
        id: "organization-1",
        name: "Acme Motors",
        status: "active",
      },
      isLoading: false,
      error: null,
    });

    render(<AdminOrganizationDetailPage />);

    // Wait for content to render
    await screen.findByText("Acme Motors");

    expect(
      screen.queryByRole("button", { name: /reenviar invitación/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the resend-invitation button only when status is pending_verification and calls mutate with the organization id", async () => {
    const mockMutate = vi.fn();
    mockUseResendInvitation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    mockUseOrganization.mockReturnValue({
      organization: {
        id: "organization-1",
        name: "Acme Motors",
        status: "pending_verification",
      },
      isLoading: false,
      error: null,
    });

    render(<AdminOrganizationDetailPage />);

    const button = await screen.findByRole("button", {
      name: /reenviar invitación/i,
    });
    fireEvent.click(button);

    expect(mockMutate).toHaveBeenCalledWith("organization-1");
  });
});
