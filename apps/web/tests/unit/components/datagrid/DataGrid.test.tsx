import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataGrid, type Vehicle } from "@/components/datagrid/DataGrid";

vi.mock("@/components/datagrid/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`status-${status}`}>{status}</span>
  ),
}));

vi.mock("@/components/datagrid/ActionMenu", () => ({
  ActionMenu: ({ vehicleId }: { vehicleId: string }) => (
    <button type="button" data-testid={`action-${vehicleId}`}>
      Actions
    </button>
  ),
}));

// Mock signed-URL hook so the photo cell renders deterministically without a QueryClient.
// Returns a signed URL for whatever key was passed in (matches the cell's lookup by key).
vi.mock("@/lib/api/products", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/products")>(
      "@/lib/api/products",
    );
  return {
    ...actual,
    useProductImageUrls: (rawKey: string | undefined) => ({
      data: rawKey
        ? {
            product_id: "mock",
            images: [
              {
                key: rawKey,
                url: rawKey.replace(
                  "https://example.com/",
                  "https://signed.example.com/",
                ),
                expires_in: 3600,
              },
            ],
          }
        : undefined,
      isLoading: false,
      error: null,
    }),
  };
});

describe("DataGrid", () => {
  const mockVehicles: Vehicle[] = [
    {
      id: "1",
      title: "2020 Toyota Camry",
      price: 25000,
      status: "published",
      photo_url: "https://example.com/photo1.jpg",
      year: 2020,
      make: "Toyota",
      model: "Camry",
      branch_name: "Downtown",
    },
    {
      id: "2",
      title: "2021 Honda Accord",
      price: 28000,
      status: "pending",
      photo_url: "https://example.com/photo2.jpg",
      year: 2021,
      make: "Honda",
      model: "Accord",
    },
  ];

  it("renders an empty table when no data is provided", () => {
    render(<DataGrid data={[]} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryAllByTestId("vehicle-row")).toHaveLength(0);
  });

  it("renders vehicle data rows", () => {
    render(<DataGrid data={mockVehicles} />);

    expect(screen.getByText("2020 Toyota Camry")).toBeInTheDocument();
    expect(screen.getByText("$25,000.00")).toBeInTheDocument();
    expect(screen.getByText("Downtown")).toBeInTheDocument();
    expect(screen.getByTestId("status-published")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(<DataGrid data={mockVehicles} onRowClick={onRowClick} />);

    await user.click(screen.getByText("2020 Toyota Camry"));

    expect(onRowClick).toHaveBeenCalledWith("1");
  });

  it("calls onRowClick when Enter is pressed on a focused row", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(<DataGrid data={mockVehicles} onRowClick={onRowClick} />);

    const firstRow = screen.getAllByTestId("vehicle-row")[0];
    firstRow.focus();
    await user.keyboard("{Enter}");

    expect(onRowClick).toHaveBeenCalledWith("1");
  });

  it("does not call onRowClick when the selection checkbox is used", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(<DataGrid data={mockVehicles} onRowClick={onRowClick} />);

    await user.click(screen.getByLabelText("Select row 0"));

    expect(onRowClick).not.toHaveBeenCalled();
    expect(screen.getByText("1 product selected")).toBeInTheDocument();
  });

  it("does not call onRowClick when the action menu trigger is clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(<DataGrid data={mockVehicles} onRowClick={onRowClick} />);

    await user.click(screen.getByTestId("action-1"));

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
