/**
 * Unit tests for the reverse-transitions API client: useReverseProduct /
 * useResubmitProduct / useRestoreProduct (POST with If-Match: <version>),
 * useAvailableTransitions and useProductAuditLogs (GET, Zod-parsed arrays).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useReverseProduct,
  useResubmitProduct,
  useRestoreProduct,
  useAvailableTransitions,
  useProductAuditLogs,
} from "@/lib/api/products";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function mockProductResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod-1",
    tenant_id: "tenant-1",
    organization_id: "org-1",
    category_id: "cat-1",
    title: "Test Vehicle",
    price_cents: 1000000,
    currency: "USD",
    condition: "used",
    status: "pending",
    attributes: { category: "generic" },
    is_featured: false,
    view_count: 0,
    favorite_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    version: 2,
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  mockFetch.mockClear();
});

describe("useReverseProduct", () => {
  it("POSTs to /reverse with the version echoed in If-Match", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProductResponse({ status: "pending" }),
    });

    const { result } = renderHook(() => useReverseProduct(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ productId: "prod-1", version: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/products/prod-1/reverse",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "If-Match": "1" },
      }),
    );
  });

  it("surfaces the server error message on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Version conflict" }),
    });

    const { result } = renderHook(() => useReverseProduct(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ productId: "prod-1", version: 1 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Version conflict");
  });
});

describe("useResubmitProduct / useRestoreProduct", () => {
  it("useResubmitProduct POSTs to /resubmit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProductResponse(),
    });

    const { result } = renderHook(() => useResubmitProduct(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ productId: "prod-1", version: 3 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/products/prod-1/resubmit",
      expect.objectContaining({ headers: { "If-Match": "3" } }),
    );
  });

  it("useRestoreProduct POSTs to /restore", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProductResponse({ status: "published" }),
    });

    const { result } = renderHook(() => useRestoreProduct(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ productId: "prod-1", version: 5 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/products/prod-1/restore",
      expect.objectContaining({ headers: { "If-Match": "5" } }),
    );
  });
});

describe("useAvailableTransitions", () => {
  it("fetches and parses the available-transitions list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          to_status: "pending",
          endpoint: "POST /products/prod-1/reverse",
          requires_role: "super_admin",
          side_effects: ["fb_unpublish"],
          method: "reverse_publication",
        },
      ],
    });

    const { result } = renderHook(() => useAvailableTransitions("prod-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].method).toBe("reverse_publication");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/products/prod-1/available-transitions",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("does not fetch when productId is undefined", () => {
    renderHook(() => useAvailableTransitions(undefined), {
      wrapper: createWrapper(),
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("useProductAuditLogs", () => {
  it("fetches and parses the audit-logs list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "log-1",
          old_status: "pending",
          new_status: "rejected",
          changed_by_user_id: "user-1",
          reason: "Missing VIN",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const { result } = renderHook(() => useProductAuditLogs("prod-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].reason).toBe("Missing VIN");
  });

  it("skips the request when enabled=false", () => {
    renderHook(() => useProductAuditLogs("prod-1", false), {
      wrapper: createWrapper(),
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
