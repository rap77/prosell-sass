import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import {
  useCategorySchema,
  usePatchCategorySchema,
  useCategorySchemaHistory,
  useCloneCategorySchema,
  downloadSchemaTemplate,
} from "@/lib/api/products";
import {
  AttributeFieldSchema,
  AttributeGroupSchema,
  CategorySchemaResponseSchema,
} from "@/lib/api/schemas/categorySchema";

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

const mockSchemaResponse = {
  attributes: { vin: { type: "string", required: true } },
  schema_version: "2026-06-25T12:00:00Z",
  updated_at: "2026-06-25T12:00:00Z",
  migration_warnings: [],
  requires_force: false,
};

const CAT_ID = "cat-001";

describe("useCategorySchema", () => {
  beforeEach(() => vi.resetAllMocks());

  it("fetches schema from GET /api/v1/categories/{id}/schema", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchemaResponse),
    });

    const { result } = renderHook(() => useCategorySchema(CAT_ID), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/v1/categories/${CAT_ID}/schema`,
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result.current.data?.attributes.vin.type).toBe("string");
  });

  it("returns parsed schema via Zod (extra fields stripped)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ...mockSchemaResponse,
          unknown_field: "should be stripped by Zod",
        }),
    });

    const { result } = renderHook(() => useCategorySchema(CAT_ID), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      (result.current.data as unknown as Record<string, unknown>)[
        "unknown_field"
      ],
    ).toBeUndefined();
  });
});

describe("usePatchCategorySchema", () => {
  it("sends PATCH to /api/v1/categories/{id}/schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchemaResponse),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => usePatchCategorySchema(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({
      categoryId: CAT_ID,
      schema: { vin: { type: "string", required: true } },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/v1/categories/${CAT_ID}/schema`);
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string);
    expect(body.attribute_schema).toEqual({
      vin: { type: "string", required: true },
    });
  });

  it("appends ?force=true when force is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchemaResponse),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => usePatchCategorySchema(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({
      categoryId: CAT_ID,
      schema: { vin: { type: "number", required: true } },
      force: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("force=true");
  });
});

describe("useCategorySchemaHistory", () => {
  it("fetches history from /api/v1/categories/{id}/schema/history", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "00000000-0000-0000-0000-000000000001",
            changed_at: "2026-06-25T10:00:00Z",
            changed_by_user_id: "00000000-0000-0000-0000-000000000002",
            change_summary: "added: year",
            migration_applied: false,
            migration_warnings: [],
          },
        ]),
    });

    const { result } = renderHook(() => useCategorySchemaHistory(CAT_ID), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].change_summary).toBe("added: year");
  });
});

describe("useCloneCategorySchema", () => {
  it("sends POST to clone-from endpoint with sourceId in path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchemaResponse),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useCloneCategorySchema(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({
      targetId: "cat-target",
      sourceId: "cat-source",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `/api/v1/categories/cat-target/schema/clone-from/cat-source`,
    );
    expect(init.method).toBe("POST");
  });
});

describe("AttributeGroupSchema", () => {
  it("parses a valid group", () => {
    const result = AttributeGroupSchema.parse({
      key: "motor",
      label: "Motor",
      order: 1,
    });
    expect(result).toEqual({ key: "motor", label: "Motor", order: 1 });
  });

  it("defaults order to 0", () => {
    const result = AttributeGroupSchema.parse({ key: "x", label: "X" });
    expect(result.order).toBe(0);
  });
});

describe("AttributeFieldSchema group field", () => {
  it("parses group when present", () => {
    const result = AttributeFieldSchema.parse({
      type: "string",
      required: false,
      group: "motor",
    });
    expect(result.group).toBe("motor");
  });

  it("group is optional — omits gracefully", () => {
    const result = AttributeFieldSchema.parse({ type: "number" });
    expect(result.group).toBeUndefined();
  });
});

describe("CategorySchemaResponseSchema attribute_groups", () => {
  it("parses attribute_groups from backend response", () => {
    const raw = {
      attributes: { year: { type: "number", required: true, group: "basic" } },
      attribute_groups: [
        { key: "basic", label: "Basic Info", order: 0 },
        { key: "motor", label: "Motor", order: 1 },
      ],
      schema_version: "2026-06-28T19:00:00Z",
      updated_at: "2026-06-28T19:00:00Z",
    };
    const result = CategorySchemaResponseSchema.parse(raw);
    expect(result.attribute_groups).toHaveLength(2);
    expect(result.attribute_groups[0].key).toBe("basic");
    expect(result.attributes.year.group).toBe("basic");
  });

  it("defaults attribute_groups to empty array when absent", () => {
    const raw = {
      attributes: {},
      schema_version: "2026-06-28T19:00:00Z",
      updated_at: "2026-06-28T19:00:00Z",
    };
    const result = CategorySchemaResponseSchema.parse(raw);
    expect(result.attribute_groups).toEqual([]);
  });
});

describe("usePatchCategorySchema attribute_groups", () => {
  it("sends attribute_groups in PATCH body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ...mockSchemaResponse,
          attribute_groups: [{ key: "basic", label: "Basic Info", order: 0 }],
        }),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => usePatchCategorySchema(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({
      categoryId: CAT_ID,
      schema: { year: { type: "number", required: true, group: "basic" } },
      groups: [{ key: "basic", label: "Basic Info", order: 0 }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.attribute_groups).toEqual([
      { key: "basic", label: "Basic Info", order: 0 },
    ]);
  });
});

describe("downloadSchemaTemplate", () => {
  it("fetches template.csv and triggers download", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["header\n"], { type: "text/csv" })),
    });
    global.fetch = fetchMock;
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake");
    global.URL.revokeObjectURL = vi.fn();

    await downloadSchemaTemplate(CAT_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/categories/${CAT_ID}/schema/template.csv`,
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
