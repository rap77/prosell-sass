/**
 * OrganizationForm Component Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrganizationForm } from "@/components/forms/OrganizationForm";

// Mock next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

// Mock stores
const mockCreateOrganization = vi.fn();
const mockUpdateOrganization = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/stores", () => ({
  useOrganizationStore: vi.fn(() => ({
    createOrganization: mockCreateOrganization,
    updateOrganization: mockUpdateOrganization,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
  useAuthStore: vi.fn(() => ({
    user: { id: "user-123", email: "test@example.com" },
  })),
}));

import { useOrganizationStore } from "@/stores";

describe("OrganizationForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockCreateOrganization.mockResolvedValue({ id: "org-123", name: "Test Org" });
    mockUpdateOrganization.mockResolvedValue({ id: "org-123", name: "Updated Org" });
    (useOrganizationStore as any).mockReturnValue({
      createOrganization: mockCreateOrganization,
      updateOrganization: mockUpdateOrganization,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  describe("Create mode", () => {
    it("renders create form with all fields", () => {
      render(<OrganizationForm mode="create" />);
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create organization/i })).toBeInTheDocument();
    });

    it("shows validation error when name is empty", async () => {
      const user = userEvent.setup();
      render(<OrganizationForm mode="create" />);
      await user.click(screen.getByRole("button", { name: /create organization/i }));
      await waitFor(() => {
        expect(screen.getByText(/organization name is required/i)).toBeInTheDocument();
      });
    });

    it("calls createOrganization with form data on submit", async () => {
      const user = userEvent.setup();
      render(<OrganizationForm mode="create" />);

      await user.type(screen.getByLabelText(/organization name/i), "My Company");
      await user.type(screen.getByLabelText(/description/i), "A great company");
      await user.click(screen.getByRole("button", { name: /create organization/i }));

      await waitFor(() => {
        expect(mockCreateOrganization).toHaveBeenCalledWith(
          expect.objectContaining({ name: "My Company", description: "A great company" })
        );
      });
    });

    it("navigates to org detail after successful creation", async () => {
      const user = userEvent.setup();
      render(<OrganizationForm mode="create" />);
      await user.type(screen.getByLabelText(/organization name/i), "My Company");
      await user.click(screen.getByRole("button", { name: /create organization/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard/org/org-123");
      });
    });

    it("calls onSuccess callback if provided instead of navigating", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<OrganizationForm mode="create" onSuccess={onSuccess} />);
      await user.type(screen.getByLabelText(/organization name/i), "My Company");
      await user.click(screen.getByRole("button", { name: /create organization/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe("Edit mode", () => {
    it("renders edit form with Save Changes button", () => {
      render(<OrganizationForm mode="edit" organizationId="org-123" />);
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    it("populates form with initialData", () => {
      render(
        <OrganizationForm
          mode="edit"
          organizationId="org-123"
          initialData={{ name: "Existing Org", description: "Existing desc" }}
        />
      );
      expect(screen.getByLabelText(/organization name/i)).toHaveValue("Existing Org");
    });

    it("calls updateOrganization on submit in edit mode", async () => {
      const user = userEvent.setup();
      render(
        <OrganizationForm mode="edit" organizationId="org-123" initialData={{ name: "Old Name" }} />
      );
      const nameInput = screen.getByLabelText(/organization name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "New Name");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith(
          "org-123",
          expect.objectContaining({ name: "New Name" })
        );
      });
    });
  });

  describe("Loading state", () => {
    it("disables submit button while loading", () => {
      (useOrganizationStore as any).mockReturnValue({
        createOrganization: mockCreateOrganization,
        updateOrganization: mockUpdateOrganization,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });
      render(<OrganizationForm mode="create" />);
      expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });
  });

  describe("Error display", () => {
    it("shows store error message", () => {
      (useOrganizationStore as any).mockReturnValue({
        createOrganization: mockCreateOrganization,
        updateOrganization: mockUpdateOrganization,
        isLoading: false,
        error: { message: "Organization already exists" },
        clearError: mockClearError,
      });
      render(<OrganizationForm mode="create" />);
      expect(screen.getByText(/organization already exists/i)).toBeInTheDocument();
    });
  });
});
