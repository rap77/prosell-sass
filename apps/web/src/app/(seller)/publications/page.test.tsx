import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  buildPublicationRows,
  toPublishableVehicleData,
  PublicationCard,
} from "./page";
import type { Product, ProductWithVehicle } from "@/types/product";

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

// Bug fix (2026-09-25): a CSV-imported vehicle's `clean_title` boolean was
// never read here — the "Título limpio" checkbox always showed unchecked
// regardless of the import, because this mapper hardcoded `true` instead
// of reading `attributes.clean_title`.
describe("toPublishableVehicleData", () => {
  it("carries the product's real clean_title value through", () => {
    const product = makeVehicleProduct({
      attributes: {
        category: "vehicle",
        vin: "1HGBH41JXMN109186",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        mileage: 0,
        clean_title: false,
      },
    }) as ProductWithVehicle;

    const vehicleData = toPublishableVehicleData(product);

    expect(vehicleData.clean_title).toBe(false);
  });

  it("leaves clean_title undefined when the attribute was never set", () => {
    const product = makeVehicleProduct() as ProductWithVehicle;

    const vehicleData = toPublishableVehicleData(product);

    expect(vehicleData.clean_title).toBeUndefined();
  });

  // Bug fix (2026-09-25): this mapper read `product.condition` (generic
  // ecommerce enum, always "used" for CSV-imported vehicles) instead of
  // the real Facebook condition grade under `attributes.vehicle_condition`.
  it("translates the CSV's real vehicle_condition into the FB canonical key", () => {
    const product = makeVehicleProduct({
      attributes: {
        category: "vehicle",
        vin: "1HGBH41JXMN109186",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        mileage: 0,
        vehicle_condition: "Muy bueno",
      },
    }) as ProductWithVehicle;

    const vehicleData = toPublishableVehicleData(product);

    expect(vehicleData.vehicle_condition).toBe("very_good");
  });

  it("leaves vehicle_condition undefined instead of falling back to product.condition", () => {
    const product = makeVehicleProduct() as ProductWithVehicle;

    const vehicleData = toPublishableVehicleData(product);

    expect(vehicleData.vehicle_condition).toBeUndefined();
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
