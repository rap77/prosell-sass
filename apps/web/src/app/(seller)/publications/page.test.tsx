import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { buildPublicationRows, PublicationCard } from "./page";
import type { Product } from "@/types/product";

// FR2.1 regression: BUG-2's root cause was the "Lista" table having no
// thumbnail column at all, and the "Grilla" card never receiving an
// `image` prop from its call site. buildPublicationRows must resolve a
// cover image key for the row, and PublicationCard must render it.

function makeVehicleProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-x",
    tenant_id: "tenant-1",
    organization_id: "org-1",
    category_id: "cat-vehicle",
    title: "2020 Toyota Camry",
    price_cents: 2500000,
    currency: "USD",
    condition: "used",
    status: "pending",
    attributes: {
      category: "vehicle",
      vin: "1HGBH41JXMN109186",
      make: "Toyota",
      model: "Camry",
      year: 2020,
      mileage: 0,
    },
    is_featured: false,
    view_count: 0,
    favorite_count: 0,
    image_urls: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    version: 1,
    ...overrides,
  } as Product;
}

describe("buildPublicationRows", () => {
  it("resolves the product's cover image key onto the row", () => {
    const product = makeVehicleProduct({
      image_urls: ["https://example.com/cover.jpg"],
    });

    const rows = buildPublicationRows([product]);

    expect(rows).toHaveLength(1);
    expect(rows[0].imageKey).toBe("https://example.com/cover.jpg");
  });

  it("leaves imageKey undefined when the product has no images", () => {
    const product = makeVehicleProduct({ image_urls: [] });

    const rows = buildPublicationRows([product]);

    expect(rows[0].imageKey).toBeUndefined();
  });
});

describe("PublicationCard", () => {
  const baseRow = {
    id: "pub-1",
    productId: "product-1",
    title: "2020 Toyota Camry",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    platform: "Facebook Marketplace" as const,
    status: "pending" as const,
  };

  it("renders the thumbnail image when an image url is provided", () => {
    const { container } = render(
      <PublicationCard pub={baseRow} image="https://example.com/cover.jpg" />,
    );

    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("renders the placeholder icon when no image is provided", () => {
    const { container } = render(<PublicationCard pub={baseRow} />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
