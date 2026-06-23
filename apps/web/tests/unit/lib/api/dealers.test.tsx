import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateDealer, useResendDealerInvitation } from "@/lib/api/dealers";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCreateDealer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          invitation_id: "inv-1",
          organization_id: "org-1",
          email: "owner@x.com",
          status: "pending",
        }),
      }),
    );
  });

  it("POSTs to /api/v1/admin/dealers and returns the parsed response", async () => {
    const { result } = renderHook(() => useCreateDealer(), { wrapper });

    result.current.mutate({
      name: "Acme Motors",
      vertical_ids: ["cat-1"],
      owner_email: "owner@x.com",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.organization_id).toBe("org-1");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/dealers",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useResendDealerInvitation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          invitation_id: "inv-2",
          organization_id: "org-1",
          email: "owner@x.com",
          status: "pending",
        }),
      }),
    );
  });

  it("POSTs to /api/v1/admin/dealers/{id}/resend-invitation", async () => {
    const { result } = renderHook(() => useResendDealerInvitation(), {
      wrapper,
    });

    result.current.mutate("org-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/dealers/org-1/resend-invitation",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
