/**
 * Unit tests for the organizations API client.
 *
 * Pinned tests for the wire format of useUpdateOrganization. These
 * checks guard the contract between the frontend ContactManager (which
 * builds OrganizationContact objects with a `name` field) and the
 * backend PATCH endpoint, which expects the name in the JSON body.
 *
 * If the frontend ContactInput interface drops the `name` field, the
 * contact is silently serialized without it and the backend never
 * receives it — these tests pin that round-trip.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const { toast } = await import("sonner");
const { useUpdateOrganization } = await import("./organizations");
const { QueryClient, QueryClientProvider } =
  await import("@tanstack/react-query");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  Wrapper.displayName = "Wrapper";
  return Wrapper;
}

const okResponse = (body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const VALID_UPDATE_RESPONSE = {
  id: "org-1",
  name: "Autos García",
  status: "active",
};

describe("useUpdateOrganization", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(okResponse(VALID_UPDATE_RESPONSE));
    (toast.success as ReturnType<typeof vi.fn>).mockClear();
    (toast.error as ReturnType<typeof vi.fn>).mockClear();
  });

  it("serializes contact.name in the PATCH body when present", async () => {
    const { result } = renderHook(() => useUpdateOrganization(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      organizationId: "org-1",
      data: {
        contacts: [
          {
            id: "c1",
            name: "Juan Pérez",
            category: "ventas",
            custom_label: null,
            phone: "+5491155551234",
            email: "juan@acme.com",
            whatsapp: null,
            order: 0,
          },
        ],
      },
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/organizations/org-1");
    expect(init.method).toBe("PATCH");

    const body = JSON.parse(init.body);
    expect(body.contacts).toHaveLength(1);
    expect(body.contacts[0].name).toBe("Juan Pérez");
  });

  it("serializes contact.name as null when absent", async () => {
    const { result } = renderHook(() => useUpdateOrganization(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      organizationId: "org-1",
      data: {
        contacts: [
          {
            id: "c2",
            name: null,
            category: "gerencia",
            custom_label: null,
            phone: null,
            email: null,
            whatsapp: null,
            order: 0,
          },
        ],
      },
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.contacts[0].name).toBeNull();
  });

  it("shows a success toast once the PATCH resolves", async () => {
    const { result } = renderHook(() => useUpdateOrganization(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      organizationId: "org-1",
      data: { name: "Autos García" },
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("does not show a success toast when the PATCH fails", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "boom" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useUpdateOrganization(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      organizationId: "org-1",
      data: { name: "Autos García" },
    });

    // ponytail: wait for the request to settle before checking the toast mocks.
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // give the failed onError a tick to fire
    await new Promise((r) => setTimeout(r, 10));

    expect(toast.success).not.toHaveBeenCalled();
  });
});
