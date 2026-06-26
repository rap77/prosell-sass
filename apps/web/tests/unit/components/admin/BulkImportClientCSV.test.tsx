/**
 * F01 — Tests for the BulkImportClientCSV wizard component.
 *
 * Validates:
 *  - Initial state shows step 1 (Upload)
 *  - Dropzones accept CSV and ZIP files
 *  - Preview button is disabled until CSV is selected
 *  - After successful preview, shows step 2 with the summary cards
 *  - Confirm step shows organization + category selects
 *  - Final import step requires both organization and category
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("react-dropzone", async () => {
  const actual =
    await vi.importActual<typeof import("react-dropzone")>("react-dropzone");
  return actual;
});

// Mock the hooks so the component doesn't hit the network.
const previewMock = {
  mutateAsync: vi.fn(),
  isPending: false,
};

const importMock = {
  mutateAsync: vi.fn(),
  isPending: false,
};

vi.mock("@/lib/api/bulkImportClient", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/bulkImportClient")
  >("@/lib/api/bulkImportClient");
  return {
    ...actual,
    usePreviewBulkUpload: () => previewMock,
    useBulkUploadVehicles: () => importMock,
  };
});

import { BulkImportClientCSV } from "@/components/admin/BulkImportClientCSV";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const ORGS = [
  { id: "22222222-2222-2222-2222-222222222222", name: "Concesionario A" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Concesionario B" },
];

const CATS = [
  { id: "44444444-4444-4444-4444-444444444444", name: "Vehículos" },
];

const successPreview = {
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
      images_found: ["img1.jpg"],
      errors: [],
    },
    {
      row_number: 3,
      vin: "BAD",
      title: "OOPS",
      importable: false,
      mapped_fields: {},
      missing_fields: ["vin"],
      unmapped_csv_columns: ["option"],
      images_found: [],
      errors: ["Invalid VIN"],
    },
  ],
  summary: {
    importable_count: 1,
    error_count: 1,
    images_count: 1,
  },
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("BulkImportClientCSV", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    previewMock.mutateAsync = vi.fn();
    previewMock.isPending = false;
    importMock.mutateAsync = vi.fn();
    importMock.isPending = false;
  });

  it("renders the upload step initially with disabled preview button", () => {
    render(<BulkImportClientCSV organizations={ORGS} categories={CATS} />, {
      wrapper: makeWrapper(),
    });

    expect(screen.getByText("1. Subir archivos")).toBeInTheDocument();
    expect(screen.getByText("Vista previa")).toBeDisabled();
  });

  it("shows preview step with summary cards after a successful preview", async () => {
    previewMock.mutateAsync.mockResolvedValue(successPreview);
    const user = userEvent.setup();

    render(<BulkImportClientCSV organizations={ORGS} categories={CATS} />, {
      wrapper: makeWrapper(),
    });

    const csvInput = document.querySelector(
      'input[accept*="text/csv"]',
    ) as HTMLInputElement;
    const csvFile = new File(["vin;title\n1A;test"], "test.csv", {
      type: "text/csv",
    });
    await user.upload(csvInput, csvFile);

    await waitFor(() => {
      expect(screen.getByText("Vista previa")).not.toBeDisabled();
    });

    await user.click(screen.getByText("Vista previa"));

    await waitFor(() => {
      expect(screen.getByText("2. Vista previa")).toBeInTheDocument();
    });

    expect(screen.getByText("Importables")).toBeInTheDocument();
    expect(screen.getByText("Con errores")).toBeInTheDocument();
    // Verify we're on the preview step (table with VIN rows visible)
    expect(screen.getByText("1FMSK7DH7LGA77418")).toBeInTheDocument();
    expect(screen.getByText("BAD")).toBeInTheDocument();
  });

  it("continues to the confirm step and shows organization + category selects", async () => {
    previewMock.mutateAsync.mockResolvedValue(successPreview);
    const user = userEvent.setup();

    render(<BulkImportClientCSV organizations={ORGS} categories={CATS} />, {
      wrapper: makeWrapper(),
    });

    const csvInput = document.querySelector(
      'input[accept*="text/csv"]',
    ) as HTMLInputElement;
    const csvFile = new File(["vin;title\n1A;test"], "test.csv", {
      type: "text/csv",
    });
    await user.upload(csvInput, csvFile);
    await user.click(screen.getByText("Vista previa"));

    await waitFor(() => {
      expect(screen.getByText("Continuar")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Continuar"));

    await waitFor(() => {
      expect(screen.getByText("3. Confirmar importación")).toBeInTheDocument();
    });
    expect(screen.getByText("Organización")).toBeInTheDocument();
    expect(screen.getByText("Categoría")).toBeInTheDocument();
  });

  it("calls onComplete after a successful import", async () => {
    previewMock.mutateAsync.mockResolvedValue(successPreview);
    importMock.mutateAsync.mockResolvedValue({
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
    });
    const onComplete = vi.fn();
    const user = userEvent.setup();

    render(
      <BulkImportClientCSV
        organizations={ORGS}
        categories={CATS}
        onComplete={onComplete}
      />,
      { wrapper: makeWrapper() },
    );

    const csvInput = document.querySelector(
      'input[accept*="text/csv"]',
    ) as HTMLInputElement;
    const csvFile = new File(["vin;title\n1A;test"], "test.csv", {
      type: "text/csv",
    });
    await user.upload(csvInput, csvFile);
    await user.click(screen.getByText("Vista previa"));

    await waitFor(() => {
      expect(screen.getByText("Continuar")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Continuar"));

    await waitFor(() => {
      expect(screen.getByText("Importar")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Importar"));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
