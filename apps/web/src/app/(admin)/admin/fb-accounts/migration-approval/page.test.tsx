import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MigrationApprovalPage from "./page";

const mockUseAuth = vi.fn();
const mockPush = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("MigrationApprovalPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: true,
    });
  });

  it("approves a pairing code without displaying response identifiers or tokens", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          authorization_id: "internal-authorization-id",
          migration_token: "internal-migration-token",
          status: "approved",
        }),
        { status: 200 },
      ),
    );

    render(<MigrationApprovalPage />);

    await user.type(
      screen.getByLabelText("Código de emparejamiento"),
      "abcd2345",
    );
    await user.click(screen.getByRole("button", { name: "Aprobar migración" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/fb-sync/migrations/authorization-requests/approve",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pairing_code: "ABCD-2345" }),
        },
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "La migración fue aprobada.",
    );
    expect(
      screen.queryByText("internal-authorization-id"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("internal-migration-token"),
    ).not.toBeInTheDocument();
  });

  it("shows the API error when approval fails", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Código vencido" }), {
        status: 410,
      }),
    );

    render(<MigrationApprovalPage />);

    await user.type(
      screen.getByLabelText("Código de emparejamiento"),
      "ABCD-2345",
    );
    await user.click(screen.getByRole("button", { name: "Aprobar migración" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Código vencido",
    );
  });

  it("disables submission while approval is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest: (response: Response) => void;
    mockFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(<MigrationApprovalPage />);

    await user.type(
      screen.getByLabelText("Código de emparejamiento"),
      "ABCD2345",
    );
    const button = screen.getByRole("button", { name: "Aprobar migración" });
    await user.click(button);

    expect(button).toBeDisabled();

    resolveRequest!(
      new Response(JSON.stringify({ status: "approved" }), { status: 200 }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "La migración fue aprobada.",
    );
  });

  it("redirects an admin who is not a super admin", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: false,
    });

    render(<MigrationApprovalPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
    expect(
      screen.queryByRole("heading", { name: "Aprobar migración de Facebook" }),
    ).not.toBeInTheDocument();
  });
});
