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
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders nothing when open is false", () => {
    render(
      <BulkUploadErrorModal
        result={mockResult}
        open={false}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders error summary when open is true", () => {
    render(
      <BulkUploadErrorModal
        result={mockResult}
        open={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/2.*uploaded/i)).toBeDefined();
    expect(screen.getByText(/1.*failed/i)).toBeDefined();
  });

  it("displays error rows in a table", () => {
    render(
      <BulkUploadErrorModal
        result={mockResult}
        open={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("3")).toBeDefined(); // row_number
    expect(screen.getByText("attributes.vin")).toBeDefined();
    expect(screen.getByText(/Required attribute/)).toBeDefined();
  });

  it("calls onClose when Close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <BulkUploadErrorModal
        result={mockResult}
        open={true}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("download button triggers fetch to errors.csv endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(["row,col,msg\n"], { type: "text/csv" })),
    });
    global.fetch = fetchMock;

    const createObjectURL = vi.fn().mockReturnValue("blob:fake");
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = vi.fn();

    render(
      <BulkUploadErrorModal
        result={mockResult}
        open={true}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(mockResult.upload_id),
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });
});
