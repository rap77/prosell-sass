# Bulk Upload Generalization — Frontend Implementation Plan (PR2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken vehicle-specific bulk upload hook (client-side CSV + dead route) with a generic FormData upload, add a `BulkUploadErrorModal` for partial failures with CSV download, and build a superadmin-gated category schema editor at `/categories/[id]/schema` with full CRUD, drag-and-drop reorder, migration warning modal, clone, template CSV, and history.

**Architecture:** Server just receives `File`; all CSV parsing moved to the backend (PR1). `useBulkUploadProducts` lives in `products.ts` (not `vehicles.ts`). Schema admin page uses the standard server-component + client-island pattern already in use across the admin area. Superadmin-only edit controls are gated via `useCurrentUser()` role check — read-only fallback for tenant admins.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query v5, Zod 3, React Hook Form, `@dnd-kit/core` (already installed), Vitest, Testing Library. TypeScript 5.5 strict.

## Global Constraints

- No `var()` in Tailwind className
- No `any` — explicit types everywhere
- No `as X` casts on backend response — use Zod `.parse()`
- `useMemo`/`useCallback` manual usage forbidden (React Compiler handles it)
- ESLint `max-warnings 0` — `pnpm lint` must pass clean
- `pnpm typecheck` must pass before every commit
- TDD: failing test first for all code with behavior
- Run tests: `cd apps/web && pnpm test run -- <path>` (Vitest)
- Conventional commits, no `Co-Authored-By`
- Never `--no-verify`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — already in `package.json`; do NOT add them

---

## File Map

### New files

| File                                                              | Purpose                                          |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| `src/lib/api/schemas/bulkUpload.ts`                               | Zod schema for `BulkUploadUploadResult` response |
| `src/lib/api/schemas/categorySchema.ts`                           | Zod schema for category schema API responses     |
| `src/components/admin/bulk-upload-error-modal.tsx`                | Modal shown when `failed_count > 0`              |
| `src/components/admin/category-schema-editor.tsx`                 | CRUD table + drag-and-drop for attribute_schema  |
| `src/app/(seller)/categories/[id]/schema/page.tsx`                | Server component that renders schema admin page  |
| `src/app/(seller)/categories/[id]/schema/schema-admin-client.tsx` | Client island for schema editor                  |
| `tests/unit/api/bulkUpload.test.tsx`                              | Hook test for `useBulkUploadProducts`            |
| `tests/unit/components/admin/BulkUploadErrorModal.test.tsx`       | Modal component tests                            |
| `tests/unit/components/admin/CategorySchemaEditor.test.tsx`       | Editor component tests                           |
| `tests/unit/api/categorySchema.test.tsx`                          | Hook test for `useCategorySchema`                |

### Modified files

| File                                               | What changes                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/api/products.ts`                          | Add `useBulkUploadProducts` (moved from vehicles.ts), add `useCategorySchema`  |
| `src/lib/api/vehicles.ts`                          | Remove `useBulkUploadProducts` (dead route + vehicle-only contract)            |
| `src/components/upload/BulkUploadCSV.tsx`          | Remove client-side parsing, update import, open error modal on partial failure |
| `tests/unit/components/upload/BulkUpload.test.tsx` | Replace stubs with real coverage                                               |

---

## Task 1: Zod schemas for bulk upload + category schema

**Files:**

- Create: `apps/web/src/lib/api/schemas/bulkUpload.ts`
- Create: `apps/web/src/lib/api/schemas/categorySchema.ts`

**Interfaces:**

- Produces: `BulkUploadRowErrorSchema`, `BulkUploadUploadResultSchema`, `BulkUploadUploadResult` (inferred type — used by Tasks 2, 3, 4)
- Produces: `CategorySchemaAttributeSchema`, `CategorySchemaResponseSchema`, `CategorySchemaResponse`, `SchemaChangeEntrySchema`, `SchemaHistorySchema` (used by Task 5, 6, 7)

No TDD for Zod schemas — shape is validated by TypeScript. Write code and commit.

- [x] **Step 1: Create bulkUpload.ts**

```typescript
// apps/web/src/lib/api/schemas/bulkUpload.ts
import { z } from "zod";

export const BulkUploadRowErrorSchema = z.object({
  row_number: z.number().int(),
  column: z.string().nullable().optional(),
  message: z.string(),
  raw_row: z.record(z.string()).optional().default({}),
});

export const BulkUploadUploadResultSchema = z.object({
  upload_id: z.string().uuid(),
  total_rows: z.number().int(),
  created_count: z.number().int(),
  failed_count: z.number().int(),
  errors: z.array(BulkUploadRowErrorSchema),
});

export type BulkUploadRowError = z.infer<typeof BulkUploadRowErrorSchema>;
export type BulkUploadUploadResult = z.infer<
  typeof BulkUploadUploadResultSchema
>;
```

- [x] **Step 2: Create categorySchema.ts**

```typescript
// apps/web/src/lib/api/schemas/categorySchema.ts
import { z } from "zod";

export const AttributeFieldSchema = z.object({
  type: z
    .enum(["string", "number", "boolean", "array", "object"])
    .default("string"),
  required: z.boolean().default(false),
  label: z.string().optional(),
  description: z.string().optional(),
});

export const CategorySchemaResponseSchema = z.object({
  attributes: z.record(AttributeFieldSchema),
  schema_version: z.string(),
  updated_at: z.string(),
  migration_warnings: z.array(z.string()).default([]),
  requires_force: z.boolean().default(false),
});

export const SchemaChangeEntrySchema = z.object({
  id: z.string().uuid(),
  changed_at: z.string(),
  changed_by_user_id: z.string().uuid(),
  change_summary: z.string(),
  migration_applied: z.boolean(),
  migration_warnings: z.array(z.string()),
});

export const SchemaHistorySchema = z.array(SchemaChangeEntrySchema);

export type AttributeField = z.infer<typeof AttributeFieldSchema>;
export type CategorySchemaResponse = z.infer<
  typeof CategorySchemaResponseSchema
>;
export type SchemaChangeEntry = z.infer<typeof SchemaChangeEntrySchema>;
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api/schemas/bulkUpload.ts \
        apps/web/src/lib/api/schemas/categorySchema.ts
git commit -m "feat(schemas): add Zod schemas for bulk upload + category schema API"
```

---

## Task 2: Rewrite useBulkUploadProducts in products.ts

**Files:**

- Modify: `apps/web/src/lib/api/products.ts`
- Modify: `apps/web/src/lib/api/vehicles.ts`
- Create: `apps/web/tests/unit/api/bulkUpload.test.tsx`

**Interfaces:**

- Consumes: `BulkUploadUploadResultSchema` from Task 1
- Produces: `useBulkUploadProducts(): UseMutationResult<BulkUploadUploadResult, Error, File>` — exported from `products.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/unit/api/bulkUpload.test.tsx`:

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useBulkUploadProducts } from "@/lib/api/products";
import { toast } from "sonner";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
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

    const file = new File(["title,price,category_id\n"], "products.csv", { type: "text/csv" });
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
```

- [ ] **Step 2: Run test — it must FAIL**

```bash
cd apps/web && pnpm test run -- tests/unit/api/bulkUpload.test.tsx
```

Expected: FAIL (import error or wrong endpoint).

- [ ] **Step 3: Add useBulkUploadProducts to products.ts**

Add to the end of `apps/web/src/lib/api/products.ts` (before any existing export):

```typescript
import { BulkUploadUploadResultSchema } from "@/lib/api/schemas/bulkUpload";
import type { BulkUploadUploadResult } from "@/lib/api/schemas/bulkUpload";

export function useBulkUploadProducts() {
  const queryClient = useQueryClient();

  return useMutation<BulkUploadUploadResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("csv_file", file);

      const res = await fetch("/api/v1/products/bulk-upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ detail: "Upload failed" }));
        throw new Error(
          typeof error.detail === "string"
            ? error.detail
            : "Failed to upload products",
        );
      }

      return BulkUploadUploadResultSchema.parse(await res.json());
    },

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });

      if (result.failed_count === 0) {
        toast.success(`Successfully uploaded ${result.created_count} products`);
      } else {
        toast.warning(
          `Uploaded ${result.created_count} products — ${result.failed_count} rows failed`,
        );
      }
    },

    onError: (err) => {
      toast.error(err.message || "Failed to upload products");
    },
  });
}
```

Make sure `useQueryClient`, `useMutation`, `toast` are already imported at the top of `products.ts`. If not, add them.

- [ ] **Step 4: Remove useBulkUploadProducts from vehicles.ts**

In `apps/web/src/lib/api/vehicles.ts`, delete:

- The `import { parse } from "csv-parse/sync"` line
- The `import type { VehicleAttributes } from "@/types/vehicle"` line (if only used by the removed hook)
- The entire `useBulkUploadProducts()` function and its JSDoc comment

Keep `useDecodeVin()` and the `DecodedVehicle` type — those are still valid.

- [ ] **Step 5: Run test — must PASS**

```bash
cd apps/web && pnpm test run -- tests/unit/api/bulkUpload.test.tsx
```

Expected: all green.

- [ ] **Step 6: Typecheck + lint**

```bash
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/api/products.ts \
        apps/web/src/lib/api/vehicles.ts \
        apps/web/tests/unit/api/bulkUpload.test.tsx
git commit -m "feat(hook): move useBulkUploadProducts to products.ts as FormData upload, remove VIN coupling"
```

---

## Task 3: Update BulkUploadCSV.tsx + replace stub tests

**Files:**

- Modify: `apps/web/src/components/upload/BulkUploadCSV.tsx`
- Modify: `apps/web/tests/unit/components/upload/BulkUpload.test.tsx`

**Interfaces:**

- Consumes: `useBulkUploadProducts` from `products.ts` (Task 2), `BulkUploadUploadResult` (Task 1)
- Produces: `onErrors?: (result: BulkUploadUploadResult) => void` prop to parent (so parent can open `BulkUploadErrorModal`)

Note: The error modal is in Task 4. For now, the component calls an `onErrors` callback with the result — the parent manages modal state. If `onErrors` is not provided, the existing `toast.warning` behavior from the hook is sufficient.

- [ ] **Step 1: Read current BulkUploadCSV.tsx**

```bash
cat apps/web/src/components/upload/BulkUploadCSV.tsx
```

Identify:

- Where `useBulkUploadProducts` is imported from
- Where `parseCSV()` / FileReader / VIN validation live
- Where `handleUpload()` calls `bulkUpload.mutateAsync(file)`

- [ ] **Step 2: Write failing component tests**

Replace all content of `apps/web/tests/unit/components/upload/BulkUpload.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/api/products", () => ({
  useBulkUploadProducts: vi.fn(),
}));

import { BulkUploadCSV } from "@/components/upload/BulkUploadCSV";
import { useBulkUploadProducts } from "@/lib/api/products";

const mockMutateAsync = vi.fn();
const mockMutation = {
  mutateAsync: mockMutateAsync,
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("BulkUploadCSV", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useBulkUploadProducts).mockReturnValue(mockMutation as ReturnType<typeof useBulkUploadProducts>);
  });

  it("renders a file input that accepts CSV", () => {
    render(<BulkUploadCSV />, { wrapper });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toContain(".csv");
  });

  it("calls useBulkUploadProducts from products (not vehicles)", () => {
    render(<BulkUploadCSV />, { wrapper });
    expect(useBulkUploadProducts).toHaveBeenCalled();
  });

  it("calls mutateAsync with the raw File (no client CSV parsing)", async () => {
    mockMutateAsync.mockResolvedValue({
      upload_id: "00000000-0000-0000-0000-000000000000",
      total_rows: 1,
      created_count: 1,
      failed_count: 0,
      errors: [],
    });

    render(<BulkUploadCSV />, { wrapper });

    const file = new File(["title,price,category_id\n"], "products.csv", { type: "text/csv" });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    const submitButton = screen.getByRole("button", { name: /upload/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(file);
    });
  });

  it("does NOT call csv-parse/sync or parse CSV client-side", async () => {
    // Verify the component doesn't import csv-parse by checking
    // that VIN is not validated client-side
    const csvWithBadVin = new File(
      ["title,price,category_id,vin\nCar,100,some-id,BADVIN\n"],
      "f.csv",
      { type: "text/csv" }
    );
    mockMutateAsync.mockResolvedValue({
      upload_id: "00000000-0000-0000-0000-000000000001",
      total_rows: 1,
      created_count: 1,
      failed_count: 0,
      errors: [],
    });

    render(<BulkUploadCSV />, { wrapper });

    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    await userEvent.upload(input, csvWithBadVin);
    await userEvent.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => {
      // File was sent directly — no VIN validation blocked it
      expect(mockMutateAsync).toHaveBeenCalledWith(csvWithBadVin);
    });
  });

  it("shows loading state while uploading", () => {
    vi.mocked(useBulkUploadProducts).mockReturnValue({
      ...mockMutation,
      isPending: true,
    } as ReturnType<typeof useBulkUploadProducts>);

    render(<BulkUploadCSV />, { wrapper });

    const submitButton = screen.getByRole("button", { name: /upload/i });
    expect(submitButton).toBeDisabled();
  });

  it("calls onErrors callback when failed_count > 0", async () => {
    const partialResult = {
      upload_id: "00000000-0000-0000-0000-000000000002",
      total_rows: 2,
      created_count: 1,
      failed_count: 1,
      errors: [{ row_number: 3, column: "attributes.vin", message: "missing vin", raw_row: {} }],
    };
    mockMutateAsync.mockResolvedValue(partialResult);

    const onErrors = vi.fn();
    render(<BulkUploadCSV onErrors={onErrors} />, { wrapper });

    const file = new File([""], "f.csv", { type: "text/csv" });
    await userEvent.upload(screen.getByLabelText(/upload/i), file);
    await userEvent.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => {
      expect(onErrors).toHaveBeenCalledWith(partialResult);
    });
  });
});
```

- [ ] **Step 3: Run tests — they must FAIL**

```bash
cd apps/web && pnpm test run -- tests/unit/components/upload/BulkUpload.test.tsx
```

Expected: multiple failures (stub tests + missing `onErrors` prop).

- [ ] **Step 4: Update BulkUploadCSV.tsx**

Replace the component's import and internal logic:

```typescript
// apps/web/src/components/upload/BulkUploadCSV.tsx
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBulkUploadProducts } from "@/lib/api/products";
import type { BulkUploadUploadResult } from "@/lib/api/schemas/bulkUpload";

interface BulkUploadCSVProps {
  onErrors?: (result: BulkUploadUploadResult) => void;
}

export function BulkUploadCSV({ onErrors }: BulkUploadCSVProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const bulkUpload = useBulkUploadProducts();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await bulkUpload.mutateAsync(selectedFile);

    if (result.failed_count > 0 && onErrors) {
      onErrors(result);
    }

    // Reset input
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="bulk-csv-input" className="text-sm font-medium">
        Upload CSV
      </label>
      <input
        id="bulk-csv-input"
        ref={inputRef}
        type="file"
        accept=".csv"
        aria-label="Upload CSV file"
        onChange={handleFileChange}
        className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
      />
      <Button
        onClick={handleUpload}
        disabled={!selectedFile || bulkUpload.isPending}
        aria-label="Upload"
      >
        {bulkUpload.isPending ? "Uploading…" : "Upload"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Run tests — must PASS**

```bash
cd apps/web && pnpm test run -- tests/unit/components/upload/BulkUpload.test.tsx
```

Expected: all green.

- [ ] **Step 6: Typecheck + lint**

```bash
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/upload/BulkUploadCSV.tsx \
        apps/web/tests/unit/components/upload/BulkUpload.test.tsx
git commit -m "feat(upload): rewrite BulkUploadCSV — FormData upload, remove client-side CSV parsing"
```

---

## Task 4: BulkUploadErrorModal component

**Files:**

- Create: `apps/web/src/components/admin/bulk-upload-error-modal.tsx`
- Create: `apps/web/tests/unit/components/admin/BulkUploadErrorModal.test.tsx`

**Interfaces:**

- Consumes: `BulkUploadUploadResult`, `BulkUploadRowError` from Task 1
- Props: `{ result: BulkUploadUploadResult; open: boolean; onClose: () => void }`
- Produces: Modal with error table + "Download errors CSV" button that fetches `GET /api/v1/products/bulk-upload/errors.csv?upload_id={result.upload_id}`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/unit/components/admin/BulkUploadErrorModal.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { BulkUploadErrorModal } from "@/components/admin/bulk-upload-error-modal";
import type { BulkUploadUploadResult } from "@/lib/api/schemas/bulkUpload";

const mockResult: BulkUploadUploadResult = {
  upload_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  total_rows: 3,
  created_count: 2,
  failed_count: 1,
  errors: [
    {
      row_number: 3,
      column: "attributes.vin",
      message: "Required attribute 'vin' is missing",
      raw_row: { title: "Bad Car", price: "18500" },
    },
  ],
};

describe("BulkUploadErrorModal", () => {
  it("renders nothing when open is false", () => {
    render(
      <BulkUploadErrorModal result={mockResult} open={false} onClose={vi.fn()} />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders error summary when open is true", () => {
    render(
      <BulkUploadErrorModal result={mockResult} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/2.*uploaded/i)).toBeDefined();
    expect(screen.getByText(/1.*failed/i)).toBeDefined();
  });

  it("displays error rows in a table", () => {
    render(
      <BulkUploadErrorModal result={mockResult} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("3")).toBeDefined(); // row_number
    expect(screen.getByText("attributes.vin")).toBeDefined();
    expect(screen.getByText(/Required attribute/)).toBeDefined();
  });

  it("calls onClose when Close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <BulkUploadErrorModal result={mockResult} open={true} onClose={onClose} />
    );
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("download button triggers fetch to errors.csv endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["row,col,msg\n"], { type: "text/csv" })),
    });
    global.fetch = fetchMock;

    // URL.createObjectURL + click is hard to test — just verify fetch is called
    const createObjectURL = vi.fn().mockReturnValue("blob:fake");
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = vi.fn();

    render(
      <BulkUploadErrorModal result={mockResult} open={true} onClose={vi.fn()} />
    );

    await userEvent.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(mockResult.upload_id),
        expect.objectContaining({ credentials: "include" })
      );
    });
  });
});
```

- [ ] **Step 2: Run tests — must FAIL**

```bash
cd apps/web && pnpm test run -- tests/unit/components/admin/BulkUploadErrorModal.test.tsx
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create BulkUploadErrorModal**

Create `apps/web/src/components/admin/bulk-upload-error-modal.tsx`:

```typescript
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BulkUploadUploadResult } from "@/lib/api/schemas/bulkUpload";

interface BulkUploadErrorModalProps {
  result: BulkUploadUploadResult;
  open: boolean;
  onClose: () => void;
}

export function BulkUploadErrorModal({ result, open, onClose }: BulkUploadErrorModalProps) {
  const handleDownload = async () => {
    const res = await fetch(
      `/api/v1/products/bulk-upload/errors.csv?upload_id=${result.upload_id}`,
      { credentials: "include" }
    );
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-upload-errors-${result.upload_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl" aria-label="Upload errors">
        <DialogHeader>
          <DialogTitle>Upload complete with errors</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{result.created_count} uploaded</span>
          {" — "}
          <span className="text-destructive font-medium">{result.failed_count} failed</span>
          {" (out of "}
          {result.total_rows}
          {" rows)"}
        </p>

        <div className="max-h-72 overflow-y-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Row</TableHead>
                <TableHead>Column</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.errors.map((err, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{err.row_number}</TableCell>
                  <TableCell className="font-mono text-xs">{err.column ?? "—"}</TableCell>
                  <TableCell className="text-sm text-destructive">{err.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDownload} aria-label="Download errors CSV">
            Download CSV
          </Button>
          <Button onClick={onClose} aria-label="Close">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests — must PASS**

```bash
cd apps/web && pnpm test run -- tests/unit/components/admin/BulkUploadErrorModal.test.tsx
```

Expected: all green.

- [ ] **Step 5: Typecheck + lint**

```bash
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/bulk-upload-error-modal.tsx \
        apps/web/tests/unit/components/admin/BulkUploadErrorModal.test.tsx
git commit -m "feat(modal): add BulkUploadErrorModal with error table + CSV download"
```

---

## Task 5: useCategorySchema hook

**Files:**

- Modify: `apps/web/src/lib/api/products.ts` (add hooks to same file — it's the product+category boundary)
- Create: `apps/web/tests/unit/api/categorySchema.test.tsx`

**Interfaces:**

- Consumes: `CategorySchemaResponseSchema`, `SchemaHistorySchema` from Task 1
- Produces:
  - `useCategorySchema(categoryId: string): UseQueryResult<CategorySchemaResponse>`
  - `usePatchCategorySchema(): UseMutationResult<CategorySchemaResponse, Error, PatchSchemaVars>`
  - `useCloneCategorySchema(): UseMutationResult<CategorySchemaResponse, Error, CloneSchemaVars>`
  - `useCategorySchemaHistory(categoryId: string): UseQueryResult<SchemaChangeEntry[]>`
  - `downloadSchemaTemplate(categoryId: string): Promise<void>` — plain async function (no hook)
- Types:

  ```typescript
  type PatchSchemaVars = {
    categoryId: string;
    schema: Record<string, AttributeField>;
    force?: boolean;
  };
  type CloneSchemaVars = {
    targetId: string;
    sourceId: string;
    force?: boolean;
  };
  ```

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/unit/api/categorySchema.test.tsx`:

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import {
  useCategorySchema,
  usePatchCategorySchema,
  useCategorySchemaHistory,
  downloadSchemaTemplate,
} from "@/lib/api/products";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
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
      expect.objectContaining({ credentials: "include" })
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
    expect((result.current.data as Record<string, unknown>)["unknown_field"]).toBeUndefined();
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
    expect(body.attribute_schema).toEqual({ vin: { type: "string", required: true } });
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
      expect.objectContaining({ credentials: "include" })
    );
  });
});
```

- [ ] **Step 2: Run tests — must FAIL**

```bash
cd apps/web && pnpm test run -- tests/unit/api/categorySchema.test.tsx
```

Expected: FAIL (exports not found).

- [ ] **Step 3: Add schema hooks to products.ts**

Add to `apps/web/src/lib/api/products.ts` after the `useBulkUploadProducts` function:

```typescript
import {
  CategorySchemaResponseSchema,
  SchemaHistorySchema,
} from "@/lib/api/schemas/categorySchema";
import type {
  AttributeField,
  CategorySchemaResponse,
  SchemaChangeEntry,
} from "@/lib/api/schemas/categorySchema";

type PatchSchemaVars = {
  categoryId: string;
  schema: Record<string, AttributeField>;
  force?: boolean;
};

type CloneSchemaVars = {
  targetId: string;
  sourceId: string;
  force?: boolean;
};

export function useCategorySchema(categoryId: string) {
  return useQuery<CategorySchemaResponse, Error>({
    queryKey: ["category-schema", categoryId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/categories/${categoryId}/schema`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load schema");
      return CategorySchemaResponseSchema.parse(await res.json());
    },
    enabled: Boolean(categoryId),
  });
}

export function usePatchCategorySchema() {
  const queryClient = useQueryClient();

  return useMutation<CategorySchemaResponse, Error, PatchSchemaVars>({
    mutationFn: async ({ categoryId, schema, force }) => {
      const url = `/api/v1/categories/${categoryId}/schema${force ? "?force=true" : ""}`;
      const res = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attribute_schema: schema }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ detail: "Failed to update schema" }));
        throw new Error(
          typeof err.detail === "string"
            ? err.detail
            : JSON.stringify(err.detail),
        );
      }
      return CategorySchemaResponseSchema.parse(await res.json());
    },

    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({
        queryKey: ["category-schema", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["category-schema-history", categoryId],
      });
      toast.success("Schema updated");
    },

    onError: (err) => {
      // Don't toast here — caller inspects the error for migration_warnings
      console.error("Schema patch failed:", err.message);
    },
  });
}

export function useCloneCategorySchema() {
  const queryClient = useQueryClient();

  return useMutation<CategorySchemaResponse, Error, CloneSchemaVars>({
    mutationFn: async ({ targetId, sourceId, force }) => {
      const url = `/api/v1/categories/${targetId}/schema/clone-from/${sourceId}${force ? "?force=true" : ""}`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to clone schema");
      return CategorySchemaResponseSchema.parse(await res.json());
    },

    onSuccess: (_, { targetId }) => {
      queryClient.invalidateQueries({
        queryKey: ["category-schema", targetId],
      });
      toast.success("Schema cloned");
    },
  });
}

export function useCategorySchemaHistory(categoryId: string) {
  return useQuery<SchemaChangeEntry[], Error>({
    queryKey: ["category-schema-history", categoryId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/categories/${categoryId}/schema/history`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to load history");
      return SchemaHistorySchema.parse(await res.json());
    },
    enabled: Boolean(categoryId),
  });
}

export async function downloadSchemaTemplate(
  categoryId: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/categories/${categoryId}/schema/template.csv`,
    {
      credentials: "include",
    },
  );
  if (!res.ok) return;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `schema-template-${categoryId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

Make sure `useQuery` is already imported from `@tanstack/react-query` at the top of `products.ts`. If not, add it.

- [ ] **Step 4: Run tests — must PASS**

```bash
cd apps/web && pnpm test run -- tests/unit/api/categorySchema.test.tsx
```

Expected: all green.

- [ ] **Step 5: Typecheck + lint**

```bash
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api/products.ts \
        apps/web/tests/unit/api/categorySchema.test.tsx
git commit -m "feat(hook): add useCategorySchema, usePatchCategorySchema, useCategorySchemaHistory, downloadSchemaTemplate"
```

---

## Task 6: CategorySchemaEditor component

**Files:**

- Create: `apps/web/src/components/admin/category-schema-editor.tsx`
- Create: `apps/web/tests/unit/components/admin/CategorySchemaEditor.test.tsx`

**Interfaces:**

- Consumes:
  - `categoryId: string` prop
  - `schema: CategorySchemaResponse` from Task 5
  - `isReadOnly?: boolean` — superadmin = false, tenant admin = true
  - `usePatchCategorySchema()` from Task 5
- Emits: `onSave(schema: Record<string, AttributeField>): void`
- Internal state: `localFields: Array<{ key: string } & AttributeField>` — editable list
- Produces: a table of attribute rows with add/edit/delete/required toggle + DnD reorder (using `@dnd-kit/sortable`)

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/unit/components/admin/CategorySchemaEditor.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/products", () => ({
  usePatchCategorySchema: vi.fn(),
}));
vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual("@dnd-kit/core");
  return { ...actual, DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});
vi.mock("@dnd-kit/sortable", async () => {
  const actual = await vi.importActual("@dnd-kit/sortable");
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    }),
  };
});

import { CategorySchemaEditor } from "@/components/admin/category-schema-editor";
import { usePatchCategorySchema } from "@/lib/api/products";
import type { CategorySchemaResponse } from "@/lib/api/schemas/categorySchema";

const mockSchema: CategorySchemaResponse = {
  attributes: {
    vin: { type: "string", required: true },
    year: { type: "number", required: false },
  },
  schema_version: "2026-06-25T12:00:00Z",
  updated_at: "2026-06-25T12:00:00Z",
  migration_warnings: [],
  requires_force: false,
};

const mockMutate = vi.fn();
const mockMutation = { mutateAsync: mockMutate, isPending: false };

describe("CategorySchemaEditor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(usePatchCategorySchema).mockReturnValue(
      mockMutation as ReturnType<typeof usePatchCategorySchema>
    );
  });

  it("renders all existing schema attributes as rows", () => {
    render(
      <CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />
    );
    expect(screen.getByText("vin")).toBeDefined();
    expect(screen.getByText("year")).toBeDefined();
  });

  it("shows required checkbox checked for required fields", () => {
    render(
      <CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />
    );
    const checkboxes = screen.getAllByRole("checkbox");
    // vin is required, year is not
    const requiredCheckboxes = checkboxes.filter(
      (c) => (c as HTMLInputElement).checked
    );
    expect(requiredCheckboxes).toHaveLength(1);
  });

  it("hides add/edit/delete controls in read-only mode", () => {
    render(
      <CategorySchemaEditor categoryId="cat-1" schema={mockSchema} isReadOnly />
    );
    expect(screen.queryByRole("button", { name: /add/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("can add a new field row", async () => {
    render(
      <CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />
    );

    await userEvent.click(screen.getByRole("button", { name: /add/i }));

    // New row appears with empty field name input
    const inputs = screen.getAllByPlaceholderText(/field name/i);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("can delete an existing field", async () => {
    render(
      <CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />
    );

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    // One field removed from the list
    expect(screen.queryAllByText(/vin|year/).length).toBeLessThan(2);
  });

  it("calls mutateAsync with updated schema on save", async () => {
    mockMutate.mockResolvedValue({ ...mockSchema, requires_force: false });
    render(
      <CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />
    );

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        categoryId: "cat-1",
        schema: expect.objectContaining({ vin: expect.any(Object) }),
      });
    });
  });

  it("shows migration warning modal when 422 with migration_warnings", async () => {
    const migrationError = new Error(
      JSON.stringify({
        migration_warnings: ["'vin' type string→number (5 products affected)"],
        requires_force: true,
      })
    );
    mockMutate.mockRejectedValue(migrationError);

    render(
      <CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />
    );

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/migration/i)).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run tests — must FAIL**

```bash
cd apps/web && pnpm test run -- tests/unit/components/admin/CategorySchemaEditor.test.tsx
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create CategorySchemaEditor**

Create `apps/web/src/components/admin/category-schema-editor.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePatchCategorySchema } from "@/lib/api/products";
import type { CategorySchemaResponse, AttributeField } from "@/lib/api/schemas/categorySchema";

interface FieldRow extends AttributeField {
  key: string;
  _id: string; // local stable id for DnD
}

interface CategorySchemaEditorProps {
  categoryId: string;
  schema: CategorySchemaResponse;
  isReadOnly?: boolean;
}

function SortableRow({
  row,
  isReadOnly,
  onUpdate,
  onDelete,
}: {
  row: FieldRow;
  isReadOnly: boolean;
  onUpdate: (id: string, patch: Partial<FieldRow>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: row._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b">
      {!isReadOnly && (
        <td className="w-8 px-2 py-2">
          <button
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab text-muted-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="px-2 py-2">
        {isReadOnly ? (
          <span className="font-mono text-sm">{row.key}</span>
        ) : (
          <Input
            placeholder="field name"
            value={row.key}
            onChange={(e) => onUpdate(row._id, { key: e.target.value })}
            className="h-7 font-mono text-sm"
          />
        )}
      </td>
      <td className="px-2 py-2">
        {isReadOnly ? (
          <span className="text-sm capitalize">{row.type}</span>
        ) : (
          <Select
            value={row.type}
            onValueChange={(v) => onUpdate(row._id, { type: v as AttributeField["type"] })}
          >
            <SelectTrigger className="h-7 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["string", "number", "boolean", "array", "object"].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="px-2 py-2 text-center">
        <Checkbox
          checked={row.required}
          disabled={isReadOnly}
          onCheckedChange={(checked) => onUpdate(row._id, { required: Boolean(checked) })}
          aria-label={`Required: ${row.key}`}
        />
      </td>
      {!isReadOnly && (
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={() => onDelete(row._id)}
            aria-label={`Delete ${row.key}`}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  );
}

let _counter = 0;
const uid = () => `field-${++_counter}`;

export function CategorySchemaEditor({
  categoryId,
  schema,
  isReadOnly = false,
}: CategorySchemaEditorProps) {
  const [rows, setRows] = useState<FieldRow[]>(() =>
    Object.entries(schema.attributes).map(([key, def]) => ({
      _id: uid(),
      key,
      ...def,
    }))
  );

  const [migrationWarnings, setMigrationWarnings] = useState<string[]>([]);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [pendingSchema, setPendingSchema] = useState<Record<string, AttributeField> | null>(null);

  const patchSchema = usePatchCategorySchema();
  const sensors = useSensors(useSensor(PointerSensor));

  const toSchemaMap = (fields: FieldRow[]): Record<string, AttributeField> =>
    Object.fromEntries(
      fields
        .filter((r) => r.key.trim())
        .map(({ key, type, required, label, description }) => [
          key.trim(),
          { type, required, label, description },
        ])
    );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRows((prev) => {
        const oldIndex = prev.findIndex((r) => r._id === active.id);
        const newIndex = prev.findIndex((r) => r._id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleAdd = () => {
    setRows((prev) => [
      ...prev,
      { _id: uid(), key: "", type: "string", required: false },
    ]);
  };

  const handleUpdate = (id: string, patch: Partial<FieldRow>) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  const handleSave = async (force = false) => {
    const schema = toSchemaMap(rows);
    try {
      await patchSchema.mutateAsync({ categoryId, schema, force: force || undefined });
      setMigrationWarnings([]);
      setShowMigrationModal(false);
      setPendingSchema(null);
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as {
            migration_warnings?: string[];
          };
          if (parsed.migration_warnings?.length) {
            setMigrationWarnings(parsed.migration_warnings);
            setPendingSchema(schema);
            setShowMigrationModal(true);
            return;
          }
        } catch {
          // Not a JSON migration warning — surface normally
        }
      }
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {!isReadOnly && <th className="w-8" />}
                <th className="px-2 py-2 text-left font-medium">Field name</th>
                <th className="px-2 py-2 text-left font-medium">Type</th>
                <th className="px-2 py-2 text-center font-medium">Required</th>
                {!isReadOnly && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={rows.map((r) => r._id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((row) => (
                  <SortableRow
                    key={row._id}
                    row={row}
                    isReadOnly={isReadOnly}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>

      {!isReadOnly && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleAdd} aria-label="Add field">
            <Plus className="mr-1 h-4 w-4" />
            Add field
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={patchSchema.isPending}
            aria-label="Save schema"
          >
            {patchSchema.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      )}

      {/* Migration warning modal */}
      <Dialog open={showMigrationModal} onOpenChange={(v) => !v && setShowMigrationModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schema migration required</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The following changes require migrating existing product data:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {migrationWarnings.map((w, i) => (
              <li key={i} className="text-amber-700 dark:text-amber-400">
                • {w}
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMigrationModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingSchema) handleSave(true);
              }}
            >
              Apply with migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — must PASS**

```bash
cd apps/web && pnpm test run -- tests/unit/components/admin/CategorySchemaEditor.test.tsx
```

Expected: all green.

- [ ] **Step 5: Typecheck + lint**

```bash
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/category-schema-editor.tsx \
        apps/web/tests/unit/components/admin/CategorySchemaEditor.test.tsx
git commit -m "feat(component): add CategorySchemaEditor with DnD reorder, migration warning modal"
```

---

## Task 7: Schema admin page + platform role gating

**Files:**

- Create: `apps/web/src/app/(seller)/categories/[id]/schema/page.tsx`
- Create: `apps/web/src/app/(seller)/categories/[id]/schema/schema-admin-client.tsx`

**Interfaces:**

- Consumes:
  - `CategorySchemaEditor` from Task 6
  - `useCategorySchema`, `useCategorySchemaHistory`, `useCloneCategorySchema`, `downloadSchemaTemplate` from Task 5
  - Current user role — check via `useCurrentUser()` (existing hook) for `has_role("super_admin")`
- Route: `GET /categories/[id]/schema` (within the `(seller)` layout)
- Platform gating: `isReadOnly = !isSuperAdmin` — superadmin sees edit controls; others see read-only view + "Contact platform admin to request schema changes" notice

No TDD for this task — the page is a composition of already-tested components. Do a smoke-test with `pnpm typecheck` + visual verification.

- [ ] **Step 1: Create schema-admin-client.tsx (client island)**

Create `apps/web/src/app/(seller)/categories/[id]/schema/schema-admin-client.tsx`:

```typescript
"use client";

import { useState } from "react";
import { CategorySchemaEditor } from "@/components/admin/category-schema-editor";
import { Button } from "@/components/ui/button";
import {
  useCategorySchema,
  useCategorySchemaHistory,
  useCloneCategorySchema,
  downloadSchemaTemplate,
} from "@/lib/api/products";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface SchemaAdminClientProps {
  categoryId: string;
}

export function SchemaAdminClient({ categoryId }: SchemaAdminClientProps) {
  const { data: schema, isLoading, isError } = useCategorySchema(categoryId);
  const { data: history } = useCategorySchemaHistory(categoryId);
  const cloneSchema = useCloneCategorySchema();
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { user } = useCurrentUser();
  const isSuperAdmin = user?.roles?.some((r) => r.role_type === "super_admin") ?? false;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading schema…</p>;
  }

  if (isError || !schema) {
    return <p className="text-sm text-destructive">Failed to load schema</p>;
  }

  return (
    <div className="space-y-6">
      {!isSuperAdmin && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Schema editing is restricted to platform administrators. Contact your ProSell account
          manager to request schema changes.
        </div>
      )}

      <CategorySchemaEditor
        categoryId={categoryId}
        schema={schema}
        isReadOnly={!isSuperAdmin}
      />

      {isSuperAdmin && (
        <div className="space-y-3 rounded border p-4">
          <h3 className="text-sm font-medium">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSchemaTemplate(categoryId)}
            >
              Download CSV template
            </Button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Source category ID"
                value={cloneSourceId}
                onChange={(e) => setCloneSourceId(e.target.value)}
                className="h-8 rounded border px-2 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!cloneSourceId || cloneSchema.isPending}
                onClick={() =>
                  cloneSchema.mutate({ targetId: categoryId, sourceId: cloneSourceId })
                }
              >
                Clone from source
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schema change history */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronDown
              className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`}
            />
            Schema history ({history?.length ?? 0})
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            {history?.map((entry) => (
              <div key={entry.id} className="rounded border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{entry.change_summary || "No changes"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.changed_at).toLocaleString()}
                  </span>
                </div>
                {entry.migration_applied && (
                  <span className="text-xs text-amber-600">⚠ Migration applied</span>
                )}
              </div>
            ))}
            {!history?.length && (
              <p className="text-sm text-muted-foreground">No schema changes recorded yet.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

- [ ] **Step 2: Create server component page.tsx**

Create `apps/web/src/app/(seller)/categories/[id]/schema/page.tsx`:

```typescript
import type { Metadata } from "next";
import { SchemaAdminClient } from "./schema-admin-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Category Schema — ${id}` };
}

export default async function CategorySchemaPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Category Schema</h1>
        <p className="text-sm text-muted-foreground">
          Configure attribute fields for products in this category.
        </p>
      </div>
      <SchemaAdminClient categoryId={id} />
    </div>
  );
}
```

- [ ] **Step 3: Verify useCurrentUser hook exists**

```bash
fd "useCurrentUser" apps/web/src --type f
```

If not found, check for an equivalent hook (`useAuth`, `useMe`, `useSession`) and adapt `schema-admin-client.tsx` to use whatever pattern is already in the codebase. Look for the pattern used in other admin components.

- [ ] **Step 4: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Lint**

```bash
cd apps/web && pnpm lint
```

Expected: 0 warnings.

- [ ] **Step 6: Run full test suite**

```bash
cd apps/web && pnpm test run
```

Expected: all tests pass, no regressions.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/(seller)/categories/[id]/schema/page.tsx \
        apps/web/src/app/(seller)/categories/[id]/schema/schema-admin-client.tsx
git commit -m "feat(page): add /categories/[id]/schema admin page with role-gated schema editor"
```

---

## Self-Review Checklist

Run after all tasks complete:

- [ ] `cd apps/web && pnpm test run` — all green, no stubs (`expect(true).toBe(true)`)
- [ ] `cd apps/web && pnpm typecheck` — 0 errors
- [ ] `cd apps/web && pnpm lint` — 0 warnings
- [ ] `useBulkUploadProducts` is NOT exported from `vehicles.ts` (removed)
- [ ] `csv-parse/sync` is NOT imported in `BulkUploadCSV.tsx`
- [ ] `BulkUploadCSV.tsx` passes the raw `File` to `mutateAsync` — no in-browser CSV parsing
- [ ] `BulkUploadErrorModal` shows when `onErrors` callback is invoked with `failed_count > 0`
- [ ] `GET /api/v1/products/bulk-upload/errors.csv` is called (not the old JSON endpoint)
- [ ] Schema editor shows read-only view for non-superadmin users
- [ ] Migration warning modal appears when PATCH returns a parsed `migration_warnings` list
- [ ] "Apply with migration" re-sends PATCH with `?force=true`
- [ ] "Download CSV template" calls `downloadSchemaTemplate(categoryId)`
- [ ] Schema history collapsible shows audit entries after a PATCH
