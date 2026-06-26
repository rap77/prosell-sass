import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
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

function TestWrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("BulkUploadCSV", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useBulkUploadProducts).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof useBulkUploadProducts>,
    );
  });

  it("renders a file input that accepts CSV", () => {
    render(<BulkUploadCSV />, { wrapper: TestWrapper });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toContain(".csv");
  });

  it("calls useBulkUploadProducts from products (not vehicles)", () => {
    render(<BulkUploadCSV />, { wrapper: TestWrapper });
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

    render(<BulkUploadCSV />, { wrapper: TestWrapper });

    const file = new File(["title,price,category_id\n"], "products.csv", {
      type: "text/csv",
    });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    const uploadButton = screen.getByRole("button", { name: /subir/i });
    fireEvent.click(uploadButton);

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(mockMutateAsync).toHaveBeenCalledWith(file);
  });

  it("calls onSuccess with created_count on full success", async () => {
    mockMutateAsync.mockResolvedValue({
      upload_id: "00000000-0000-0000-0000-000000000000",
      total_rows: 3,
      created_count: 3,
      failed_count: 0,
      errors: [],
    });
    const onSuccess = vi.fn();

    render(<BulkUploadCSV onSuccess={onSuccess} />, { wrapper: TestWrapper });

    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    const file = new File(["title,price,category_id\n"], "products.csv", {
      type: "text/csv",
    });
    await userEvent.upload(input, file);

    fireEvent.click(screen.getByRole("button", { name: /subir/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(3));
  });

  it("calls onErrors callback with the full BulkUploadUploadResult on partial failure", async () => {
    const partial = {
      upload_id: "00000000-0000-0000-0000-000000000001",
      total_rows: 2,
      created_count: 1,
      failed_count: 1,
      errors: [
        {
          row_number: 2,
          column: "price",
          message: "price must be a number",
          raw_row: { title: "Bad Car", price: "twenty thousand" },
        },
      ],
    };
    mockMutateAsync.mockResolvedValue(partial);
    const onErrors = vi.fn();

    render(<BulkUploadCSV onErrors={onErrors} />, { wrapper: TestWrapper });

    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    const file = new File(["title,price\n"], "products.csv", {
      type: "text/csv",
    });
    await userEvent.upload(input, file);
    fireEvent.click(screen.getByRole("button", { name: /subir/i }));

    await waitFor(() => expect(onErrors).toHaveBeenCalledWith(partial));
  });

  it("shows toast error on HTTP failure", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Too many rows"));
    const { toast } = await import("sonner");

    render(<BulkUploadCSV />, { wrapper: TestWrapper });

    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    const file = new File(["title,price\n"], "products.csv", {
      type: "text/csv",
    });
    await userEvent.upload(input, file);
    fireEvent.click(screen.getByRole("button", { name: /subir/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Too many rows");
  });
});
