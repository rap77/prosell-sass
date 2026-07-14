/**
 * AdminEditOrganizationPage.test.tsx
 *
 * Owner (propietario) section: read-only email + resend invitation
 * (pending orgs only). Parity with the create form per admin request.
 */
import { render, screen } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminEditOrganizationPage from "./page";

const mockUseRequireAdmin = vi.fn();
vi.mock("@/hooks/useRequireAdmin", () => ({
  useRequireAdmin: () => mockUseRequireAdmin(),
}));

const mockUseDealer = vi.fn();
const mockUseResendInvitation = vi.fn();
const mockUseUpdateDealer = vi.fn();
const mockUseDealerBrokers = vi.fn();
const mockUseCreateDealerBroker = vi.fn();
const mockUseUpdateDealerBroker = vi.fn();
const mockUseDeleteDealerBroker = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useDealer: () => mockUseDealer(),
  useResendDealerInvitation: () => mockUseResendInvitation(),
  useUpdateDealer: () => mockUseUpdateDealer(),
  useDealerBrokers: () => mockUseDealerBrokers(),
  useCreateDealerBroker: () => mockUseCreateDealerBroker(),
  useUpdateDealerBroker: () => mockUseUpdateDealerBroker(),
  useDeleteDealerBroker: () => mockUseDeleteDealerBroker(),
}));

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useParams: () => ({ id: "dealer-1" }),
}));

function makeDealer(overrides: Record<string, unknown> = {}) {
  return {
    id: "dealer-1",
    name: "Acme Motors",
    tenant_id: "dealer-1",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    owner_email: "owner@acme.com",
    ...overrides,
  };
}

describe("AdminEditOrganizationPage — owner section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRequireAdmin.mockReturnValue(true);
    mockUseResendInvitation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseUpdateDealer.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    });
    mockUseDealerBrokers.mockReturnValue({ data: [], isLoading: false });
    mockUseCreateDealerBroker.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseUpdateDealerBroker.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeleteDealerBroker.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("shows the owner email as read-only", () => {
    mockUseDealer.mockReturnValue({
      dealer: makeDealer(),
      isLoading: false,
      error: null,
    });

    render(<AdminEditOrganizationPage />);

    const ownerInput = screen.getByLabelText(/propietario/i);
    expect(ownerInput).toHaveValue("owner@acme.com");
    expect(ownerInput).toHaveAttribute("readonly");
  });

  it("shows resend invitation button only for pending orgs", () => {
    mockUseDealer.mockReturnValue({
      dealer: makeDealer({ status: "pending_verification" }),
      isLoading: false,
      error: null,
    });

    render(<AdminEditOrganizationPage />);

    expect(
      screen.getByRole("button", { name: /reenviar invitación/i }),
    ).toBeInTheDocument();
  });

  it("hides resend invitation button for active orgs", () => {
    mockUseDealer.mockReturnValue({
      dealer: makeDealer(),
      isLoading: false,
      error: null,
    });

    render(<AdminEditOrganizationPage />);

    expect(
      screen.queryByRole("button", { name: /reenviar invitación/i }),
    ).not.toBeInTheDocument();
  });
});
