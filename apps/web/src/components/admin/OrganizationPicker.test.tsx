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
  { id: "organization-1", name: "Organization One", product_count: 3 },
  { id: "organization-2", name: "Organization Two", product_count: 5 },
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

  it('shows the "Todas las organizaciones" option for an admin and calls setViewingOrgId("ALL_ORGS") on click', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAdmin: true });

    render(<OrganizationPicker />);

    await user.click(screen.getByRole("button"));

    const option = await screen.findByText("Todas las organizaciones");
    await user.click(option);

    await waitFor(() => {
      expect(mockSetViewingOrgId).toHaveBeenCalledWith("ALL_ORGS");
    });
  });

  it("hides an organization with product_count: 0 from the list", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUseOrganizations.mockReturnValue({
      data: [
        ...mockOrganizations,
        { id: "organization-empty", name: "Empty Org", product_count: 0 },
      ],
      isLoading: false,
    });

    render(<OrganizationPicker />);

    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("Organization Two")).toBeInTheDocument();
    expect(screen.queryByText("Empty Org")).not.toBeInTheDocument();
  });

  it("hides an organization with product_count absent from the list", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUseOrganizations.mockReturnValue({
      data: [
        ...mockOrganizations,
        { id: "organization-no-count", name: "No Count Org" },
      ],
      isLoading: false,
    });

    render(<OrganizationPicker />);

    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("Organization Two")).toBeInTheDocument();
    expect(screen.queryByText("No Count Org")).not.toBeInTheDocument();
  });

  it('shows "Mi organización" as the trigger label when viewingOrgId is null', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUseOrganizationStore.mockReturnValue({
      viewingOrgId: null,
      setViewingOrgId: mockSetViewingOrgId,
    });

    render(<OrganizationPicker />);

    expect(screen.getByRole("button")).toHaveTextContent("Mi organización");
  });

  it('shows "Todas las organizaciones" as the trigger label when viewingOrgId is "ALL_ORGS"', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUseOrganizationStore.mockReturnValue({
      viewingOrgId: "ALL_ORGS",
      setViewingOrgId: mockSetViewingOrgId,
    });

    render(<OrganizationPicker />);

    expect(screen.getByRole("button")).toHaveTextContent(
      "Todas las organizaciones",
    );
  });

  it("shows the organization name as the trigger label when viewingOrgId is a specific organization", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUseOrganizationStore.mockReturnValue({
      viewingOrgId: "organization-2",
      setViewingOrgId: mockSetViewingOrgId,
    });

    render(<OrganizationPicker />);

    expect(screen.getByRole("button")).toHaveTextContent("Organization Two");
  });

  it("defaults a super_admin with no viewingOrgId to ALL_ORGS on mount", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, isSuperAdmin: true });
    mockUseOrganizationStore.mockReturnValue({
      viewingOrgId: null,
      setViewingOrgId: mockSetViewingOrgId,
    });

    render(<OrganizationPicker />);

    await waitFor(() => {
      expect(mockSetViewingOrgId).toHaveBeenCalledWith("ALL_ORGS");
    });
  });

  it("does not override an explicit selection back to 'mi organización' for a super_admin", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, isSuperAdmin: true });
    mockUseOrganizationStore.mockReturnValue({
      viewingOrgId: "organization-2",
      setViewingOrgId: mockSetViewingOrgId,
    });

    render(<OrganizationPicker />);

    expect(mockSetViewingOrgId).not.toHaveBeenCalled();
  });

  it("does not default a regular admin (not super_admin) away from 'mi organización'", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, isSuperAdmin: false });
    mockUseOrganizationStore.mockReturnValue({
      viewingOrgId: null,
      setViewingOrgId: mockSetViewingOrgId,
    });

    render(<OrganizationPicker />);

    expect(mockSetViewingOrgId).not.toHaveBeenCalled();
  });
});
