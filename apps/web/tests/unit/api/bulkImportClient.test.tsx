/**
 * F01 — Tests for the bulkImportClient hooks.
 *
 * Validates:
 *  - usePreviewBulkUpload posts CSV (+ optional ZIP) to /preview
 *  - useBulkUploadVehicles posts CSV + ZIP + orgId + catId to /with-images
 *  - Both hooks validate responses with Zod safeParse
 *  - Both hooks surface backend error messages correctly
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import {
  useBulkUploadVehicles,
  usePreviewBulkUpload,
} from "@/lib/api/bulkImportClient";
import { toast } from "sonner";

// ─── Test utilities ─────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

function makeCsvFile(name = "test.csv"): File {
  return new File(["vin;title\n1A;test"], name, { type: "text/csv" });
}

const validPreviewResponse = {
  total_rows: 2,
  rows: [
    {
      row_number: 2,
      vin: "1FMSK7DH7LGA77418",
      title: "DJ",
      importable: true,
      mapped_fields: { price_cents: 1780000 },
      missing_fields: [],
      unmapped_csv_columns: ["option"],
      images_found: [],
      errors: [],
    },
  ],
  summary: {
    importable_count: 1,
    error_count: 0,
    images_count: 0,
  },
};

const validImportResponse = {
  total_rows: 1,
  imported_count: 1,
  updated_count: 0,
  failed_count: 0,
  results: [
    {
      row_number: 2,
      vin: "1FMSK7DH7LGA77418",
      product_id: "11111111-1111-1111-1111-111111111111",
      images_uploaded: 0,
      status: "imported",
      errors: [],
    },
  ],
};

// ─── usePreviewBulkUpload tests ──────────────────────────────────────────────

describe("usePreviewBulkUpload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("POSTs CSV (and optional ZIP) to /preview and returns parsed response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validPreviewResponse),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => usePreviewBulkUpload(), {
      wrapper: makeWrapper(),
    });

    const csv = makeCsvFile();
    const response = await result.current.mutateAsync({ csv });

    expect(response.total_rows).toBe(2);
    expect(response.summary.importable_count).toBe(1);
    expect(response.rows[0].vin).toBe("1FMSK7DH7LGA77418");

    // Verify fetch was called with FormData and correct endpoint
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/products/bulk-upload/preview",
      expect.objectContaining({ method: "POST" }),
    );
    const fetchArgs = fetchMock.mock.calls[0];
    expect(fetchArgs[1].body).toBeInstanceOf(FormData);
  });

  it("throws when the response shape does not match the Zod schema", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          total_rows: "not-a-number", // invalid
          rows: [],
          summary: {},
        }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePreviewBulkUpload(), {
      wrapper: makeWrapper(),
    });

    await expect(result.current.mutateAsync({ csv: makeCsvFile() })).rejects.toThrow();
  });

  it("surfaces the backend error detail string", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: "Tenant not allowed" }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePreviewBulkUpload(), {
      wrapper: makeWrapper(),
    });

    await expect(result.current.mutateAsync({ csv: makeCsvFile() })).rejects.toThrow(
      "Tenant not allowed",
    );
  });

  it("calls toast.error on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: "Bad CSV" }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePreviewBulkUpload(), {
      wrapper: makeWrapper(),
    });

    try {
      await result.current.mutateAsync({ csv: makeCsvFile() });
    } catch {
      // expected
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

// ─── useBulkUploadVehicles tests ─────────────────────────────────────────────

describe("useBulkUploadVehicles", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("POSTs CSV + ZIP + orgId + catId to /with-images and returns parsed response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validImportResponse),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useBulkUploadVehicles(), {
      wrapper: makeWrapper(),
    });

    const csv = makeCsvFile();
    const zip = new File(["zip"], "images.zip", { type: "application/zip" });
    const response = await result.current.mutateAsync({
      csv,
      zip,
      organizationId: "22222222-2222-2222-2222-222222222222",
      categoryId: "33333333-3333-3333-3333-333333333333",
    });

    expect(response.imported_count).toBe(1);
    expect(response.results[0].status).toBe("imported");
    expect(response.results[0].product_id).toBe(
      "11111111-1111-1111-1111-111111111111",
    );

    const fetchArgs = fetchMock.mock.calls[0];
    expect(fetchArgs[0]).toBe("/api/v1/products/bulk-upload/with-images");
    expect(fetchArgs[1].body).toBeInstanceOf(FormData);
  });

  it("surfaces backend error detail on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: "Organization not found" }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useBulkUploadVehicles(), {
      wrapper: makeWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        csv: makeCsvFile(),
        organizationId: "22222222-2222-2222-2222-222222222222",
        categoryId: "33333333-3333-3333-3333-333333333333",
      }),
    ).rejects.toThrow("Organization not found");
  });

  it("invalidates products and catalog queries on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validImportResponse),
    }) as unknown as typeof fetch;

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useBulkUploadVehicles(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      csv: makeCsvFile(),
      organizationId: "22222222-2222-2222-2222-222222222222",
      categoryId: "33333333-3333-3333-3333-333333333333",
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["catalog"] });
    });
  });
});
