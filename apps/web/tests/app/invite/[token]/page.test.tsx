import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AcceptInvitationPage from "@/app/invite/[token]/page";
import { teamApi, ApiError, type TeamMember } from "@/lib/api/teamApi";

const mockPush = vi.fn();
let mockToken: string | undefined = "tok123";
vi.mock("next/navigation", () => ({
  useParams: () => ({ token: mockToken }),
  useRouter: () => ({ push: mockPush }),
}));

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AcceptInvitationPage />
    </QueryClientProvider>,
  );
}

const mockMember: TeamMember = {
  id: "member-1",
  team_id: "team-1",
  user_id: "user-1",
  tenant_id: "tenant-1",
  role: "vendor",
  commission_rate: null,
  joined_at: "2026-01-01T00:00:00Z",
};

describe("AcceptInvitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = "tok123";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts the invitation and redirects to the dashboard after 2s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(teamApi, "acceptInvitation").mockResolvedValue(mockMember);

    renderWithClient();

    await waitFor(() =>
      expect(screen.getByText(/¡bienvenido al equipo!/i)).toBeInTheDocument(),
    );

    vi.advanceTimersByTime(2000);
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/dashboard?welcome=team"),
    );
  });

  it("shows the expired state when the backend reports an expired invitation", async () => {
    vi.spyOn(teamApi, "acceptInvitation").mockRejectedValue(
      new ApiError("Invitation has expired", 410),
    );

    renderWithClient();

    await waitFor(() =>
      expect(screen.getByText(/invitación vencida/i)).toBeInTheDocument(),
    );
  });

  it("shows the already-member state and redirects to /dashboard after 2s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(teamApi, "acceptInvitation").mockRejectedValue(
      new ApiError("User is already a member", 409),
    );

    renderWithClient();

    await waitFor(() =>
      expect(screen.getByText(/ya sos miembro/i)).toBeInTheDocument(),
    );

    vi.advanceTimersByTime(2000);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("does not call acceptInvitation when there is no token", async () => {
    mockToken = undefined;
    const acceptInvitation = vi.spyOn(teamApi, "acceptInvitation");

    renderWithClient();

    await waitFor(() =>
      expect(
        screen.getByText(/no se proporcionó el token de invitación/i),
      ).toBeInTheDocument(),
    );
    expect(acceptInvitation).not.toHaveBeenCalled();
  });
});
