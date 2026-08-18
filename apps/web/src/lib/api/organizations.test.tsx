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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateOrganization } from "./organizations";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const okResponse = (body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("useUpdateOrganization", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(okResponse({}));
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
});
