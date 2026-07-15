/**
 * AdminEditOrganizationPage.test.tsx
 *
 * Verifies the org edit form: identity + optional fields + brokers.
 * The legacy read-only "Propietario" section was removed (orgs no longer
 * carry an owner_email concept in the form — see business model).
 */
import { render, screen } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminEditOrganizationPage from "./page";

const mockUseRequireAdmin = vi.fn();
vi.mock("@/hooks/useRequireAdmin", () => ({
  useRequireAdmin: () => mockUseRequireAdmin(),
}));

const mockUseOrganization = vi.fn();
const mockUseUpdateOrganization = vi.fn();
const mockUseOrganizationBrokers = vi.fn();
const mockUseCreateOrganizationBroker = vi.fn();
const mockUseUpdateOrganizationBroker = vi.fn();
const mockUseDeleteOrganizationBroker = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganization: () => mockUseOrganization(),
  useUpdateOrganization: () => mockUseUpdateOrganization(),
  useOrganizationBrokers: () => mockUseOrganizationBrokers(),
  useCreateOrganizationBroker: () => mockUseCreateOrganizationBroker(),
  useUpdateOrganizationBroker: () => mockUseUpdateOrganizationBroker(),
  useDeleteOrganizationBroker: () => mockUseDeleteOrganizationBroker(),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: mockPush }),
  useParams: () => ({ id: "org-1" }),
}));

function makeOrganization(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "org-1",
    name: "Acme Motors",
    tenant_id: "org-1",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("AdminEditOrganizationPage — form structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRequireAdmin.mockReturnValue(true);
    mockUseUpdateOrganization.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    });
    mockUseOrganizationBrokers.mockReturnValue({ data: [], isLoading: false });
    mockUseCreateOrganizationBroker.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseUpdateOrganizationBroker.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeleteOrganizationBroker.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("does not render the legacy read-only Propietario section", () => {
    mockUseOrganization.mockReturnValue({
      organization: makeOrganization(),
      isLoading: false,
      error: null,
    });

    render(<AdminEditOrganizationPage />);

    expect(screen.queryByLabelText(/propietario/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reenviar invitación/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the identity row (Nombre + Siglas + Color)", () => {
    mockUseOrganization.mockReturnValue({
      organization: makeOrganization({ code: "ACME", color: "#FF0000" }),
      isLoading: false,
      error: null,
    });

    const { container } = render(<AdminEditOrganizationPage />);

    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Acme Motors");
    expect(screen.getByLabelText(/siglas/i)).toHaveValue("ACME");
    // <input type="color"> exposes its value via the `value` attribute, not
    // via the accessible name — query the DOM directly.
    const colorInput = container.querySelector(
      'input[type="color"]',
    ) as HTMLInputElement | null;
    expect(colorInput).not.toBeNull();
    expect(colorInput?.value).toBe("#ff0000");
  });
});
