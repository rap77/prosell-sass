import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataGrid, type ProductRow } from "@/components/datagrid/DataGrid";

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

const mockMarkProductsSold = vi.fn();

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
    useSubmitProductsForApproval: () => ({ mutate: vi.fn(), isPending: false }),
    useMarkProductsSold: () => ({
      mutate: mockMarkProductsSold,
      isPending: false,
    }),
  };
});

describe("DataGrid", () => {
  const mockVehicles: ProductRow[] = [
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

  beforeEach(() => {
    mockMarkProductsSold.mockClear();
  });

  it("renders an empty table when no data is provided", () => {
    render(<DataGrid data={[]} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryAllByTestId("product-row")).toHaveLength(0);
  });

  it("renders vehicle data rows", () => {
    render(<DataGrid data={mockVehicles} />);

    expect(screen.getByText("2020 Toyota Camry")).toBeInTheDocument();
    expect(screen.getByText("$25,000.00")).toBeInTheDocument();
    expect(screen.getByText("Downtown")).toBeInTheDocument();
    expect(screen.getByTestId("status-published")).toBeInTheDocument();
  });

  it("renders a rejected-in-review product as 'failed' instead of re-mapping it to 'draft'", () => {
    // Bug: the container (catalog/page.tsx) already maps Product.status
    // ("rejected") to VehicleStatus ("failed") via transformProductToVehicle
    // before handing rows to DataGrid. The status cell used to re-run
    // mapProductStatusToVehicleStatus on that already-mapped value; "failed"
    // isn't a key in that map, so it silently fell back to "draft".
    render(
      <DataGrid
        data={[
          {
            id: "3",
            title: "2018 Ford Focus",
            price: 12000,
            status: "failed",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("status-failed")).toBeInTheDocument();
    expect(screen.queryByTestId("status-draft")).not.toBeInTheDocument();
  });

  it("offers bulk submit-for-review for a selected rejected (failed) row", async () => {
    // Same root cause as above: the eligibility filter compared
    // row.status to raw "rejected", which never appears in these
    // already-mapped rows (the value is "failed"), so a rejected
    // product could never be re-submitted from the table view.
    const user = userEvent.setup();
    render(
      <DataGrid
        data={[
          { id: "3", title: "2018 Ford Focus", price: 12000, status: "failed" },
        ]}
      />,
    );

    await user.click(screen.getByLabelText("Select row 0"));

    expect(
      screen.getByRole("button", { name: /enviar a revisión \(1\)/i }),
    ).toBeInTheDocument();
  });

  it("offers bulk mark-as-sold for a selected published row, gated by a confirm dialog", async () => {
    const user = userEvent.setup();
    render(
      <DataGrid
        data={[
          {
            id: "1",
            title: "2020 Toyota Camry",
            price: 25000,
            status: "published",
          },
        ]}
      />,
    );

    await user.click(screen.getByLabelText("Select row 0"));

    const soldButton = screen.getByRole("button", {
      name: /marcar vendido \(1\)/i,
    });
    await user.click(soldButton);

    // The action is final, so it's gated behind a confirm step instead
    // of firing on the toolbar button click.
    expect(mockMarkProductsSold).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));

    expect(mockMarkProductsSold).toHaveBeenCalledWith(["1"]);
  });

  it("does not count a pending-review row as eligible for mark-as-sold", async () => {
    const user = userEvent.setup();
    render(
      <DataGrid
        data={[
          {
            id: "2",
            title: "2021 Honda Accord",
            price: 28000,
            status: "pending",
          },
        ]}
      />,
    );

    await user.click(screen.getByLabelText("Select row 0"));

    expect(
      screen.queryByRole("button", { name: /marcar vendido/i }),
    ).not.toBeInTheDocument();
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

    const firstRow = screen.getAllByTestId("product-row")[0];
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
