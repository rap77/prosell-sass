import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcceptOrgInvitationPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "tok123" }),
  useRouter: () => ({ push: mockPush }),
}));

describe("AcceptOrgInvitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the form and shows success on a valid token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "a",
          refresh_token: "b",
          user: { id: "1", email: "owner@x.com", full_name: "Owner Name", tenant_id: "org-1" },
          requires_2fa: false,
        }),
      }),
    );
    render(<AcceptOrgInvitationPage />);

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Owner" } });
    fireEvent.change(screen.getByLabelText(/apellido/i), { target: { value: "Name" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "Aa1!aaaa" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aceptar/i }));

    await waitFor(() => expect(screen.getByText(/bienvenido/i)).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/auth/accept-org-invitation",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an expired message when the backend says so", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Invitation has expired" }),
      }),
    );
    render(<AcceptOrgInvitationPage />);

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Owner" } });
    fireEvent.change(screen.getByLabelText(/apellido/i), { target: { value: "Name" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "Aa1!aaaa" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aceptar/i }));

    await waitFor(() => expect(screen.getByText(/venci/i)).toBeInTheDocument());
  });
});
