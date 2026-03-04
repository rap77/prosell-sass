/**
 * TeamForm Component Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamForm } from "@/components/forms/TeamForm";

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockCreateTeam = vi.fn();
const mockUpdateTeam = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/stores", () => ({
  useTeamStore: vi.fn(() => ({
    createTeam: mockCreateTeam,
    updateTeam: mockUpdateTeam,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
  useAuthStore: vi.fn(() => ({
    user: { id: "user-123" },
  })),
}));

import { useTeamStore } from "@/stores";

describe("TeamForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockCreateTeam.mockResolvedValue({ id: "team-123", name: "Test Team" });
    mockUpdateTeam.mockResolvedValue({ id: "team-123", name: "Updated Team" });
    (useTeamStore as any).mockReturnValue({
      createTeam: mockCreateTeam,
      updateTeam: mockUpdateTeam,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  it("renders create form with name field", () => {
    render(<TeamForm mode="create" organizationId="org-123" />);
    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create team/i })).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    render(<TeamForm mode="create" organizationId="org-123" />);
    await user.click(screen.getByRole("button", { name: /create team/i }));
    await waitFor(() => {
      expect(screen.getByText(/team name is required/i)).toBeInTheDocument();
    });
  });

  it("calls createTeam with name on submit", async () => {
    const user = userEvent.setup();
    render(<TeamForm mode="create" organizationId="org-123" />);
    await user.type(screen.getByLabelText(/team name/i), "Sales Team");
    await user.click(screen.getByRole("button", { name: /create team/i }));

    await waitFor(() => {
      expect(mockCreateTeam).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Sales Team", organization_id: "org-123" })
      );
    });
  });

  it("renders edit mode with Save Changes button", () => {
    render(<TeamForm mode="edit" teamId="team-123" organizationId="org-123" />);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("populates name field with initialData in edit mode", () => {
    render(
      <TeamForm mode="edit" teamId="team-123" organizationId="org-123" initialData={{ name: "Old Team" }} />
    );
    expect(screen.getByLabelText(/team name/i)).toHaveValue("Old Team");
  });

  it("disables form while loading", () => {
    (useTeamStore as any).mockReturnValue({
      createTeam: mockCreateTeam,
      updateTeam: mockUpdateTeam,
      isLoading: true,
      error: null,
      clearError: mockClearError,
    });
    render(<TeamForm mode="create" organizationId="org-123" />);
    expect(screen.getByLabelText(/team name/i)).toBeDisabled();
  });

  it("shows minimum length validation error", async () => {
    const user = userEvent.setup();
    render(<TeamForm mode="create" organizationId="org-123" />);
    await user.type(screen.getByLabelText(/team name/i), "A");
    await user.click(screen.getByRole("button", { name: /create team/i }));

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });
});
