// ponytail: mock presentations for different verticals
import type { CategoryPresentation } from "@/types/category";

/**
 * Mock presentation for vehicle vertical.
 * Shows: Year | Mileage | Fuel | Transmission
 */
export const VEHICLE_PRESENTATION: CategoryPresentation = {
  card_fields: [
    { key: "year", source: "attributes.year" },
    { key: "mileage", source: "attributes.mileage" },
    { key: "fuel_type", source: "attributes.fuel_type" },
    { key: "transmission", source: "attributes.transmission" },
  ],
  subtitle_template: "{year} {make} {model}",
  filter_fields: [
    { key: "year", filter_type: "range" },
    { key: "make", filter_type: "select" },
    { key: "model", filter_type: "select" },
    { key: "fuel_type", filter_type: "select" },
    { key: "transmission", filter_type: "select" },
  ],
};

/**
 * Mock presentation for real estate vertical.
 * Shows: Bedrooms | Bathrooms | Area | Type
 */
export const REAL_ESTATE_PRESENTATION: CategoryPresentation = {
  card_fields: [
    { key: "bedrooms", source: "attributes.bedrooms" },
    { key: "bathrooms", source: "attributes.bathrooms" },
    { key: "area_m2", source: "attributes.area_m2" },
    { key: "property_type", source: "attributes.property_type" },
  ],
  subtitle_template: "{property_type} en {location_city}",
  filter_fields: [
    { key: "bedrooms", filter_type: "range" },
    { key: "bathrooms", filter_type: "range" },
    { key: "area_m2", filter_type: "range" },
    { key: "property_type", filter_type: "select" },
  ],
};

/**
 * Mock presentation for electronics vertical.
 * Shows: Brand | Condition | Warranty | Stock
 */
export const ELECTRONICS_PRESENTATION: CategoryPresentation = {
  card_fields: [
    { key: "brand", source: "attributes.brand" },
    { key: "condition", source: "attributes.condition" },
    { key: "warranty_months", source: "attributes.warranty_months" },
    { key: "stock", source: "attributes.stock" },
  ],
  subtitle_template: "{brand} - {condition}",
  filter_fields: [
    { key: "brand", filter_type: "select" },
    { key: "condition", filter_type: "select" },
    { key: "warranty_months", filter_type: "range" },
  ],
};
