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
    attribute_schema: { year: true, make: true, model: true, vin: true },
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-2",
    name: "Sedans",
    slug: "sedans",
    attribute_schema: { year: true, make: true, model: true, vin: true },
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

export const MOCK_VIN_DECODED = {
  vin: "2GNALCEK1H1615946",
  year: 2017,
  make: "Chevrolet",
  model: "Equinox",
  trim: "LT",
  engine: "2.4L I4",
  body_type: "SUV",
  drivetrain: "FWD",
  transmission: "Automatic",
  fuel_type: "Gasoline",
};
