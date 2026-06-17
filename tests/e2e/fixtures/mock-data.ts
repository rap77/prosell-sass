/**
 * Shared Test Fixtures
 *
 * Reusable test data for E2E tests.
 */

export const MOCK_CATEGORIES = [
  {
    id: "cat-1",
    name: "SUVs",
    slug: "suvs",
    attribute_schema: {
      year: true,
      make: true,
      model: true,
      vin: true,
      trim: true,
      engine: true,
      body_type: true,
      drivetrain: true,
      transmission: true,
      fuel_type: true,
      mileage: true,
      exterior_color: true,
      interior_color: true,
    },
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-2",
    name: "Sedans",
    slug: "sedans",
    attribute_schema: {
      year: true,
      make: true,
      model: true,
      vin: true,
      trim: true,
      engine: true,
      body_type: true,
      drivetrain: true,
      transmission: true,
      fuel_type: true,
      mileage: true,
      exterior_color: true,
      interior_color: true,
    },
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

export const MOCK_VEHICLES = [
  {
    id: "prod-1",
    name: "Vehicle 1",
    category_id: "cat-1",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "prod-2",
    name: "Vehicle 2",
    category_id: "cat-2",
    status: "active",
    created_at: "2026-01-02T00:00:00Z",
  },
];

/**
 * Mock vehicle list in BackendVehicleItem format (as returned by GET /api/v1/vehicles).
 * The frontend transforms these via transformVehicleWithProduct().
 *
 * Mix: Toyota (2), Chevrolet (2), Honda (1)
 * Statuses: published (3), draft (1), sold (1)
 * Years: 2018-2023
 */
export const MOCK_VEHICLE_LIST = [
  {
    id: "vehicle-1",
    product_id: "prod-v1",
    vin: "1NXBR32E87Z123456",
    year: 2022,
    make: "Toyota",
    model: "Camry",
    trim: "XSE",
    mileage: 15000,
    exterior_color: "Midnight Black",
    interior_color: "Black",
    dealer_id: "dealer-1",
    dealer_name: "Sunrise Motors",
    created_at: "2026-01-10T00:00:00Z",
    product: {
      id: "prod-v1",
      title: "2022 Toyota Camry XSE",
      price_cents: 2799900,
      status: "published",
      category_id: "cat-2",
      created_at: "2026-01-10T00:00:00Z",
    },
  },
  {
    id: "vehicle-2",
    product_id: "prod-v2",
    vin: "4T1BF1FK2GU203567",
    year: 2021,
    make: "Toyota",
    model: "Corolla",
    trim: "LE",
    mileage: 28000,
    exterior_color: "Celestite Gray",
    interior_color: "Beige",
    dealer_id: "dealer-1",
    dealer_name: "Sunrise Motors",
    created_at: "2026-01-11T00:00:00Z",
    product: {
      id: "prod-v2",
      title: "2021 Toyota Corolla LE",
      price_cents: 2199900,
      status: "published",
      category_id: "cat-2",
      created_at: "2026-01-11T00:00:00Z",
    },
  },
  {
    id: "vehicle-3",
    product_id: "prod-v3",
    vin: "2GNALCEK1H1615946",
    year: 2023,
    make: "Chevrolet",
    model: "Equinox",
    trim: "LT",
    mileage: 8000,
    exterior_color: "Summit White",
    interior_color: "Jet Black",
    dealer_id: "dealer-2",
    dealer_name: "City Auto Group",
    created_at: "2026-01-12T00:00:00Z",
    product: {
      id: "prod-v3",
      title: "2023 Chevrolet Equinox LT",
      price_cents: 3149900,
      status: "published",
      category_id: "cat-1",
      created_at: "2026-01-12T00:00:00Z",
    },
  },
  {
    id: "vehicle-4",
    product_id: "prod-v4",
    vin: "1G1ZD5ST9JF123890",
    year: 2018,
    make: "Chevrolet",
    model: "Malibu",
    trim: "Premier",
    mileage: 65000,
    exterior_color: "Black",
    interior_color: "Light Ash Gray",
    dealer_id: undefined,
    dealer_name: undefined,
    created_at: "2026-01-13T00:00:00Z",
    product: {
      id: "prod-v4",
      title: "2018 Chevrolet Malibu Premier",
      price_cents: 1699900,
      status: "draft",
      category_id: "cat-2",
      created_at: "2026-01-13T00:00:00Z",
    },
  },
  {
    id: "vehicle-5",
    product_id: "prod-v5",
    vin: "2HGFG4A52AH523890",
    year: 2020,
    make: "Honda",
    model: "Civic",
    trim: "Sport",
    mileage: 42000,
    exterior_color: "Rallye Red",
    interior_color: "Black",
    dealer_id: "dealer-2",
    dealer_name: "City Auto Group",
    created_at: "2026-01-14T00:00:00Z",
    product: {
      id: "prod-v5",
      title: "2020 Honda Civic Sport",
      price_cents: 1999900,
      status: "sold",
      category_id: "cat-2",
      created_at: "2026-01-14T00:00:00Z",
    },
  },
];

/**
 * Full API response wrapper for vehicle list endpoint.
 * Matches BackendCatalogResponse shape used by useInfiniteVehicles().
 */
export const MOCK_VEHICLE_RESPONSE = {
  items: MOCK_VEHICLE_LIST,
  next_cursor: null,
  has_more: false,
};

/**
 * Mock org verticals response (Subsystem A contract).
 *
 * Mirrors `OrgVerticalsResponse` from `apps/web/src/types/category.ts`:
 *   GET /api/v1/organizations/{organization_id}/verticals
 *
 * The catalog grid's `categoryPresentationMap` is built from this payload
 * (not from the legacy `/api/v1/categories` endpoint), so tests that
 * exercise the ProductCard must mock it. Vehicle vertical (slug
 * "vehicles") maps to the MOCK_VEHICLE_LIST category_ids ("cat-1",
 * "cat-2"). For real-estate tests, override the verticals mock inline
 * — the spec at catalog-productcard.spec.ts does this.
 */
export const MOCK_ORG_VERTICALS = {
  verticals: [
    {
      id: "v-vehicles",
      name: "Vehículos",
      // MUST match the slug in `placeholderForVertical` NICHE_MAP, else
      // the test for placeholder fallback would get the generic asset
      // instead of the vehicles niche one.
      slug: "vehiculos-y-transporte",
      presentation: null,
      categories: [
        {
          id: "cat-1",
          name: "SUVs",
          slug: "suvs",
          attribute_schema: {
            year: { type: "number", filter_type: "range" },
            mileage: {
              type: "number",
              filter_type: "range",
              unit: "km",
            },
            make: { type: "string", filter_type: "exact" },
            model: { type: "string", filter_type: "exact" },
          },
          presentation: {
            card_fields: [
              { key: "year", source: "attributes.year" },
              { key: "mileage", source: "attributes.mileage" },
            ],
            subtitle_template: "{make} {model} {year}",
            filter_fields: [],
          },
          filter_fields: [],
        },
        {
          id: "cat-2",
          name: "Sedans",
          slug: "sedans",
          attribute_schema: {
            year: { type: "number", filter_type: "range" },
            mileage: {
              type: "number",
              filter_type: "range",
              unit: "km",
            },
            make: { type: "string", filter_type: "exact" },
            model: { type: "string", filter_type: "exact" },
          },
          presentation: {
            card_fields: [
              { key: "year", source: "attributes.year" },
              { key: "mileage", source: "attributes.mileage" },
            ],
            subtitle_template: "{make} {model} {year}",
            filter_fields: [],
          },
          filter_fields: [],
        },
      ],
    },
  ],
};

export const MOCK_VIN_DECODED = {
  vin: "2GNALCEK1H1615946",
  year: 2017,
  make: "chevrolet", // Lowercase to match FB_BRANDS key format
  model: "Equinox",
  trim: "LT",
  engine: "LEA", // Changed from "2.4L I4" to match test expectation /LEA|SIDI|Direct Injection/i
  body_type: "suv", // Lowercase to match FB_BODY_STYLES key format
  drivetrain: "fwd", // Lowercase to match FB_DRIVETRAINS key format
  transmission: "automatic", // Lowercase to match FB_TRANSMISSIONS key format
  fuel_type: "gasoline", // Lowercase to match FB_FUEL_TYPES key format
};
