/**
 * Unit tests for the roles (permission profiles) API client — bloque 3.
 *
 * Pinned tests for wire-format risk points:
 * - grants/scope serialize with the backend's exact snake_case keys
 *   (zone/action/scope_type/organization_ids) on create/update/clone.
 * - assign/remove/delete return 204 No Content with an EMPTY body — calling
 *   `.json()` on that throws (`Unexpected end of JSON input`), so the client
 *   must branch on status before parsing, same class of bug already
 *   documented for the Next.js BFF proxy (project.md § Deviations).
 * - the user-by-email lookup treats 404 as "not found" (resolves to null),
 *   not as a thrown error — it's a normal "no match" outcome for a search,
 *   not an exceptional one.
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

const {
  useCreateRole,
  useUpdateRole,
  useCloneRole,
  useDeleteRole,
  useAssignRoleToUser,
  useRemoveRoleFromUser,
  useLookupUserByEmail,
  useRoleUsers,
} = await import("./roles");
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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const noContentResponse = () => new Response(null, { status: 204 });

const VALID_ROLE = {
  id: "role-1",
  name: "Manager Global",
  description: null,
  role_type: null,
  is_system_role: false,
  tenant_id: "org-1",
  grants: [{ zone: "catalog", action: "read" }],
  scope: { scope_type: "own", organization_ids: [] },
};

describe("useCreateRole", () => {
  beforeEach(() => mockFetch.mockReset());

  it("serializes grants/scope with the backend's exact snake_case keys", async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_ROLE, 201));
    const { result } = renderHook(() => useCreateRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: "Manager Global",
      description: "desc",
      grants: [{ zone: "catalog", action: "read" }],
      scope: { scope_type: "own", organization_ids: [] },
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/roles");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "Manager Global",
      description: "desc",
      grants: [{ zone: "catalog", action: "read" }],
      scope: { scope_type: "own", organization_ids: [] },
    });
  });
});

describe("useUpdateRole", () => {
  beforeEach(() => mockFetch.mockReset());

  it("PATCHes /{id} with the full replace body", async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_ROLE));
    const { result } = renderHook(() => useUpdateRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      roleId: "role-1",
      data: {
        name: "Manager Global",
        description: null,
        grants: [{ zone: "catalog", action: "read" }],
        scope: { scope_type: "all", organization_ids: [] },
      },
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/roles/role-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body).scope).toEqual({
      scope_type: "all",
      organization_ids: [],
    });
  });
});

describe("useCloneRole", () => {
  beforeEach(() => mockFetch.mockReset());

  it("POSTs to /{id}/clone with only name/description", async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_ROLE, 201));
    const { result } = renderHook(() => useCloneRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      sourceRoleId: "manager",
      name: "Manager Global",
      description: "Clon de Manager",
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/roles/manager/clone");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "Manager Global",
      description: "Clon de Manager",
    });
  });
});

describe("useDeleteRole", () => {
  beforeEach(() => mockFetch.mockReset());

  it("handles the backend's 204 No Content without parsing a body", async () => {
    mockFetch.mockResolvedValue(noContentResponse());
    const { result } = renderHook(() => useDeleteRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("role-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/roles/role-1");
    expect(init.method).toBe("DELETE");
  });
});

describe("useAssignRoleToUser", () => {
  beforeEach(() => mockFetch.mockReset());

  it("POSTs to /{roleId}/users/{userId} with no body and handles 204", async () => {
    mockFetch.mockResolvedValue(noContentResponse());
    const { result } = renderHook(() => useAssignRoleToUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ roleId: "role-1", userId: "user-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/roles/role-1/users/user-1");
    expect(init.method).toBe("POST");
  });

  it("surfaces a 403 escalation error via extractErrorMessage", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ detail: "Cannot grant permissions..." }, 403),
    );
    const { result } = renderHook(() => useAssignRoleToUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ roleId: "role-1", userId: "user-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Cannot grant permissions...");
  });
});

describe("useRemoveRoleFromUser", () => {
  beforeEach(() => mockFetch.mockReset());

  it("DELETEs /{roleId}/users/{userId} and handles 204", async () => {
    mockFetch.mockResolvedValue(noContentResponse());
    const { result } = renderHook(() => useRemoveRoleFromUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ roleId: "role-1", userId: "user-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/roles/role-1/users/user-1");
    expect(init.method).toBe("DELETE");
  });
});

describe("useRoleUsers", () => {
  beforeEach(() => mockFetch.mockReset());

  it("parses the bare array the backend returns (no items/total wrapper)", async () => {
    const users = [
      { id: "user-1", email: "a@b.com", full_name: "A B", tenant_id: "org-1" },
    ];
    mockFetch.mockResolvedValue(jsonResponse(users));
    const { result } = renderHook(() => useRoleUsers("role-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(users);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/roles/role-1/users");
  });
});

describe("useLookupUserByEmail", () => {
  beforeEach(() => mockFetch.mockReset());

  it("resolves to the matching user on 200", async () => {
    const user = {
      id: "user-1",
      email: "a@b.com",
      full_name: "A B",
      tenant_id: "org-1",
    };
    mockFetch.mockResolvedValue(jsonResponse(user));
    const { result } = renderHook(() => useLookupUserByEmail(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("a@b.com");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(user);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/admin/users/by-email?email=a%40b.com");
  });

  it("resolves to null on 404 instead of throwing — a miss is a normal search outcome", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ detail: "User not found" }, 404),
    );
    const { result } = renderHook(() => useLookupUserByEmail(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("nobody@test.local");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("still throws on a non-404 error (e.g. 403)", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ detail: "Forbidden" }, 403));
    const { result } = renderHook(() => useLookupUserByEmail(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("a@b.com");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Forbidden");
  });
});
