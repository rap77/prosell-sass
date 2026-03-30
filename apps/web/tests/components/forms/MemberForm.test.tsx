/**
 * MemberForm Component Tests
 *
 * Tests member creation/editing form
 * Phase 09: Verifies toast.error() is called on submission failure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberForm } from "@/components/forms/MemberForm";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockAddMember = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/stores", () => ({
  useTeamStore: vi.fn(() => ({
    addMember: mockAddMember,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
  useAuthStore: vi.fn(() => ({
    user: { id: "user-123" },
  })),
}));

import { useTeamStore } from "@/stores";
import { toast } from "sonner";

describe("MemberForm", () => {
  beforeEach(() => {
    mockAddMember.mockResolvedValue({ id: "member-123", user_id: "user-456" });
    (useTeamStore as any).mockReturnValue({
      addMember: mockAddMember,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders form with user_id and role fields", () => {
    render(<MemberForm teamId="team-123" />);
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add member/i })).toBeInTheDocument();
  });

  it("shows validation error when user_id is empty", async () => {
    const user = userEvent.setup();
    render(<MemberForm teamId="team-123" />);
    await user.click(screen.getByRole("button", { name: /add member/i }));
    await waitFor(() => {
      expect(screen.getByText(/user id is required/i)).toBeInTheDocument();
    });
  });

  it("calls addTeamMember with form data on submit", async () => {
    const user = userEvent.setup();
    render(<MemberForm teamId="team-123" />);

    await user.type(screen.getByLabelText(/user id/i), "user-456");
    await user.selectOptions(screen.getByLabelText(/role/i), "vendor");
    await user.click(screen.getByRole("button", { name: /add member/i }));

    await waitFor(() => {
      expect(mockAddMember).toHaveBeenCalledWith(
        "team-123",
        expect.objectContaining({ user_id: "user-456", role: "vendor" })
      );
    });
  });

  it("calls toast.error when addTeamMember throws", async () => {
    const user = userEvent.setup();
    mockAddMember.mockRejectedValue(new Error("Failed to add member"));

    render(<MemberForm teamId="team-123" />);
    await user.type(screen.getByLabelText(/user id/i), "user-456");
    await user.selectOptions(screen.getByLabelText(/role/i), "vendor");
    await user.click(screen.getByRole("button", { name: /add member/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to submit member form");
    });
  });

  it("disables form while loading", () => {
    (useTeamStore as any).mockReturnValue({
      addMember: mockAddMember,
      isLoading: true,
      error: null,
      clearError: mockClearError,
    });
    render(<MemberForm teamId="team-123" />);
    expect(screen.getByLabelText(/user id/i)).toBeDisabled();
  });
});
