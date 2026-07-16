/**
 * OrganizationPicker.test.tsx — Subsystem D Phase 6.2
 *
 * Renders only for admins (ORG_ADMIN_VIEW_ALL) and updates
 * organizationStore.viewingOrgId when a organization is selected.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { OrganizationPicker } from "./OrganizationPicker";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseOrganizations = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganizations: () => mockUseOrganizations(),
}));

const mockSetViewingOrgId = vi.fn();
const mockUseOrganizationStore = vi.fn();
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: (selector: (state: unknown) => unknown) =>
    selector(mockUseOrganizationStore()),
}));

const mockOrganizations = [
  { id: "organization-1", name: "Organization One" },
  { id: "organization-2", name: "Organization Two" },
];

describe("OrganizationPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrganizations.mockReturnValue({
      data: mockOrganizations,
      isLoading: false,
    });
    mockUseOrganizationStore.mockReturnValue({
      viewingOrgId: null,
      setViewingOrgId: mockSetViewingOrgId,
    });
  });

  it("renders nothing for a non-admin user", () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });

    const { container } = render(<OrganizationPicker />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the picker for an admin user", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });

    render(<OrganizationPicker />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls setViewingOrgId when a organization is selected", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAdmin: true });

    render(<OrganizationPicker />);

    await user.click(screen.getByRole("button"));

    const option = await screen.findByText("Organization Two");
    await user.click(option);

    await waitFor(() => {
      expect(mockSetViewingOrgId).toHaveBeenCalledWith("organization-2");
    });
  });
});
