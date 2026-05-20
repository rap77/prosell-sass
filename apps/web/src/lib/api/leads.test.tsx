/**
 * Unit tests for leads API hooks
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLeads, useLead, useUpdateLeadStatus, useReassignLead, LeadStatus } from "./leads";
import { toast } from "sonner";

// Mock fetch
global.fetch = vi.fn();

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock response helpers
const mockLeadsResponse = {
  items: [
    {
      id: "lead-1",
      tenant_id: "tenant-1",
      buyer_name: "John Doe",
      buyer_email: "john@example.com",
      buyer_phone: "+1234567890",
      product_id: "vehicle-1",
      vendedor_id: "vendedor-1",
      message: "Interested in this vehicle",
      source: "facebook",
      status: LeadStatus.NEW,
      created_at: "2026-04-28T12:00:00Z",
      updated_at: "2026-04-28T12:00:00Z",
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
};

const mockLeadResponse = {
  id: "lead-1",
  tenant_id: "tenant-1",
  buyer_name: "John Doe",
  buyer_email: "john@example.com",
  buyer_phone: "+1234567890",
  product_id: "vehicle-1",
  vendedor_id: "vendedor-1",
  message: "Interested in this vehicle",
  source: "facebook",
  status: LeadStatus.NEW,
  created_at: "2026-04-28T12:00:00Z",
  updated_at: "2026-04-28T12:00:00Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useLeads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch leads successfully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadsResponse,
    });

    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].buyer_name).toBe("John Doe");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/leads?limit=50&offset=0"),
      expect.objectContaining({
        credentials: "include",
      })
    );
  });

  it("should pass status filter to API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadsResponse,
    });

    const { result } = renderHook(
      () => useLeads({ status: LeadStatus.CONTACTED }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("status=contacted"),
      expect.any(Object)
    );
  });

  it("should pass search query to API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadsResponse,
    });

    const { result } = renderHook(() => useLeads({ search: "John" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("search=John"),
      expect.any(Object)
    );
  });

  it("should handle fetch errors", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Unauthorized" }),
    });

    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Unauthorized");
  });
});

describe("useLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch single lead successfully", async () => {
    // GET /api/v1/leads/{id} returns LeadDetailResponse: { lead, audit_logs }
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: mockLeadResponse, audit_logs: [] }),
    });

    const { result } = renderHook(() => useLead("lead-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.buyer_name).toBe("John Doe");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/leads/lead-1",
      expect.objectContaining({
        credentials: "include",
      })
    );
  });

  it("should not fetch if leadId is undefined", async () => {
    const { result } = renderHook(() => useLead(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("useUpdateLeadStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update lead status successfully", async () => {
    const updatedLead = {
      ...mockLeadResponse,
      status: LeadStatus.CONTACTED,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedLead,
    });

    const { result } = renderHook(() => useUpdateLeadStatus("lead-1"), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ status: LeadStatus.CONTACTED });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/leads/lead-1/status",
      expect.objectContaining({
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: expect.stringContaining('"status":"contacted"'),
      })
    );

    expect(toast.success).toHaveBeenCalledWith("Lead status updated successfully");
  });

  it("should show error toast on failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid status transition" }),
    });

    const { result } = renderHook(() => useUpdateLeadStatus("lead-1"), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({ status: LeadStatus.LOST });
    } catch (error) {
      // Expected error
    }

    expect(toast.error).toHaveBeenCalledWith("Invalid status transition");
  });
});

describe("useReassignLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reassign lead to new vendedor successfully", async () => {
    const newVendedorId = "vendedor-2";

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockLeadResponse,
        vendedor_id: newVendedorId,
      }),
    });

    const { result } = renderHook(() => useReassignLead("lead-1"), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ vendedor_id: newVendedorId });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/leads/lead-1/assign",
      expect.objectContaining({
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: expect.stringContaining(`"vendedor_id":"${newVendedorId}"`),
      })
    );

    expect(toast.success).toHaveBeenCalledWith("Lead reassigned successfully");
  });

  it("should unassign lead when vendedor_id is null", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockLeadResponse,
        vendedor_id: null,
      }),
    });

    const { result } = renderHook(() => useReassignLead("lead-1"), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ vendedor_id: null });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/leads/lead-1/assign",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining('"vendedor_id":null'),
      })
    );

    expect(toast.success).toHaveBeenCalledWith("Lead reassigned successfully");
  });

  it("should show error toast on failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Lead not found" }),
    });

    const { result } = renderHook(() => useReassignLead("lead-1"), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({ vendedor_id: "vendedor-2" });
    } catch (error) {
      // Expected error
    }

    expect(toast.error).toHaveBeenCalledWith("Lead not found");
  });
});
