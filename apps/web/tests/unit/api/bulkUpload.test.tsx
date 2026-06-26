import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { useBulkUploadProducts } from "@/lib/api/products";
import { toast } from "sonner";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

const mockSuccessResponse = {
  upload_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  total_rows: 1,
  created_count: 1,
  failed_count: 0,
  errors: [],
};

const mockPartialResponse = {
  upload_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567891",
  total_rows: 2,
  created_count: 1,
  failed_count: 1,
  errors: [
    {
      row_number: 3,
      column: "attributes.vin",
      message: "Required attribute 'vin' is missing",
      raw_row: { title: "Bad Car" },
    },
  ],
};

describe("useBulkUploadProducts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sends file as FormData to /api/v1/products/bulk-upload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useBulkUploadProducts(), {
      wrapper: makeWrapper(),
    });

    const file = new File(["title,price,category_id\n"], "products.csv", {
      type: "text/csv",
    });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/products/bulk-upload");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get("csv_file")).toBeInstanceOf(File);
  });

  it("does NOT send JSON body or Content-Type application/json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useBulkUploadProducts(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(new File([""], "f.csv", { type: "text/csv" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = (init.headers as Record<string, string>) ?? {};
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("shows success toast when no errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });

    const { result } = renderHook(() => useBulkUploadProducts(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate(new File([""], "f.csv", { type: "text/csv" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("1"));
  });

  it("returns BulkUploadUploadResult with errors on partial success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPartialResponse),
    });

    const { result } = renderHook(() => useBulkUploadProducts(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate(new File([""], "f.csv", { type: "text/csv" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.failed_count).toBe(1);
    expect(data.errors[0].column).toBe("attributes.vin");
    expect(data.upload_id).toBe(mockPartialResponse.upload_id);
  });

  it("throws on HTTP error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: "Too many rows" }),
    });

    const { result } = renderHook(() => useBulkUploadProducts(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate(new File([""], "f.csv", { type: "text/csv" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/Too many rows/);
  });
});
