import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataGrid, type ProductRow } from "./DataGrid";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// ponytail: shared mock function the test suite can re-configure per case.
// Default returns no data so consumers never crash; per-test
// mockImplementation swaps in a signed-URL response.
const mockUseProductImageUrls = vi.fn(
  (_id: unknown) => ({ data: undefined }) as unknown,
);
vi.mock("@/lib/api/products", () => ({
  useProductImageUrls: (id: unknown) => mockUseProductImageUrls(id) as never,
  useSubmitProductsForApproval: () => ({ mutate: vi.fn() }),
}));

const mockData: ProductRow[] = [
  {
    id: "1",
    title: "Tesla Model 3 2023",
    price: 45000,
    status: "published",
    year: 2023,
    make: "Tesla",
    model: "Model 3",
  },
  {
    id: "2",
    title: "Honda Civic 2022",
    price: 28000,
    status: "draft",
    year: 2022,
    make: "Honda",
    model: "Civic",
  },
];

const PHOTO_KEY = "vehicles/tenant-1/1.jpeg";
const PHOTO_FULL_URL = "http://localhost:9002/prosell-assets/" + PHOTO_KEY;
const SIGNED_URL =
  "http://localhost:9002/prosell-assets/" + PHOTO_KEY + "?signature=abc";

describe("DataGrid Mobile Responsive (Minimum Viable)", () => {
  it("should have horizontal scroll container for mobile", () => {
    const { container } = render(<DataGrid data={mockData} />);

    // Find the scroll container (contains table)
    const scrollContainer = container.querySelector("div.overflow-x-auto");

    expect(scrollContainer).toBeDefined();
    expect(scrollContainer?.className).toContain("overflow-x-auto");
    expect(scrollContainer?.className).toContain("touch-pan-x");
  });

  it("should make first column (select) sticky during horizontal scroll", () => {
    render(<DataGrid data={mockData} />);

    // Find first <th> (select column header)
    const firstHeader = screen.getAllByRole("columnheader")[0];

    // Should have sticky left-0 classes
    expect(firstHeader?.className).toMatch(/sticky/);
    expect(firstHeader?.className).toMatch(/left-0/);
  });

  it("should make first <td> (select checkbox) sticky in each row", () => {
    render(<DataGrid data={mockData} />);

    // Get all rows
    const rows = screen.getAllByTestId("product-row");
    const firstRow = rows[0];

    // Get first cell (checkbox cell)
    const firstCell = firstRow?.querySelector("td");

    // Should be sticky
    expect(firstCell?.className).toMatch(/sticky/);
    expect(firstCell?.className).toMatch(/left-0/);
  });
});

describe("DataGrid Touch Targets (Minimum Viable)", () => {
  it("should render action menu buttons", () => {
    render(<DataGrid data={mockData} onEdit={vi.fn()} />);

    // ActionMenu exists (rendered in Actions column)
    // Touch target size enforcement happens in Button component
    const actionsColumn = screen
      .getAllByRole("columnheader")
      .find((th) => th.textContent === "Actions");

    expect(actionsColumn).toBeDefined();
  });

  it("should make Actions column sticky right on mobile (Task 2b)", () => {
    render(<DataGrid data={mockData} onEdit={vi.fn()} />);

    // Find Actions column header
    const actionsHeader = screen
      .getAllByRole("columnheader")
      .find((th) => th.textContent === "Actions");

    // Should be sticky right-0 for always-visible actions on mobile
    expect(actionsHeader?.className).toMatch(/sticky/);
    expect(actionsHeader?.className).toMatch(/right-0/);
  });

  it("should make Actions cell sticky right in each row (Task 2b)", () => {
    render(<DataGrid data={mockData} onEdit={vi.fn()} />);

    // Get first row
    const rows = screen.getAllByTestId("product-row");
    const firstRow = rows[0];

    // Get Actions cell (last td)
    const cells = firstRow?.querySelectorAll("td");
    const actionsCell = cells?.[cells.length - 1];

    // Should be sticky right-0
    expect(actionsCell?.className).toMatch(/sticky/);
    expect(actionsCell?.className).toMatch(/right-0/);
  });
});

describe("DataGrid Desktop Compatibility", () => {
  it("should maintain sticky header on vertical scroll", () => {
    render(<DataGrid data={mockData} />);

    const thead = screen.getAllByRole("columnheader")[0]?.closest("thead");

    // Header should be sticky top
    expect(thead?.className).toContain("sticky");
    expect(thead?.className).toContain("top-0");
  });
});

// ponytail: TDD tests for the SignedPhotoCell image-loading contract

describe("DataGrid Photo Cell (SignedPhotoCell)", () => {
  beforeEach(() => {
    mockUseProductImageUrls.mockReset();
    mockUseProductImageUrls.mockReturnValue({ data: undefined });
  });

  it("renders a No photo placeholder when the product has no photo_url", () => {
    render(<DataGrid data={mockData} />);

    // ponytail: mockData rows have no photo_url, so both should show No photo
    expect(screen.getAllByText("No photo")).toHaveLength(2);
  });

  it("renders the <img> with the signed URL when photo_url is a storage key", () => {
    mockUseProductImageUrls.mockReturnValue({
      data: {
        product_id: "1",
        images: [{ key: PHOTO_KEY, url: SIGNED_URL, og_url: null }],
        cover_image_key: PHOTO_KEY,
      },
    } as never);

    const { container } = render(
      <DataGrid
        data={[
          {
            id: "1",
            title: "With Photo",
            price: 1000,
            status: "published",
            photo_url: PHOTO_KEY,
          },
        ]}
      />,
    );

    // ponytail: SignedPhotoCell renders <Image alt=""/> which is
    // decorative (per WCAG), so getByRole('img') excludes it. Query
    // the DOM directly to assert the signed URL was wired through.
    const img = container.querySelector("img") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.src).toBe(SIGNED_URL);
  });

  it("renders the <img> when photo_url is a full public URL (legacy data)", () => {
    // ponytail: the bulk-upload flow writes public URLs to image_urls,
    // not storage keys. The SignedPhotoCell must derive the storage key
    // from the URL and find the signed entry in the image-urls response,
    // otherwise the cell falls back to "No photo" for every legacy product.
    mockUseProductImageUrls.mockReturnValue({
      data: {
        product_id: "1",
        images: [{ key: PHOTO_KEY, url: SIGNED_URL, og_url: null }],
        cover_image_key: PHOTO_KEY,
      },
    } as never);

    const { container } = render(
      <DataGrid
        data={[
          {
            id: "1",
            title: "Legacy URL Photo",
            price: 1000,
            status: "published",
            photo_url: PHOTO_FULL_URL,
          },
        ]}
      />,
    );

    const img = container.querySelector("img") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.src).toBe(SIGNED_URL);
  });
});
