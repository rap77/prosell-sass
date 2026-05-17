/**
 * Product types matching backend Pydantic models
 *
 * Matches: apps/api/src/prosell/application/dto/product/
 */

import type { ProductAttributes, VehicleAttributes } from './vehicle';

/**
 * Product entity with status workflow
 *
 * Matches: apps/api/src/prosell/domain/entities/product.py
 */
export interface Product {
  id: string;
  tenant_id: string;
  organization_id: string;
  category_id: string;

  // Basic info
  title: string;
  slug?: string;
  description?: string;

  // Pricing (in cents)
  price_cents: number;
  currency: string; // default: "USD"

  // Condition and status
  condition: 'new' | 'used' | 'refurbished';
  status: 'draft' | 'pending' | 'published' | 'paused' | 'reserved' | 'sold' | 'rejected' | 'archived';

  // Flexible attributes (category-specific)
  attributes: ProductAttributes;

  // Location
  location_city?: string;
  location_state?: string;
  location_zip?: string;

  // Visibility
  is_featured: boolean;
  view_count: number;
  favorite_count: number;

  // Approval workflow
  submitted_for_approval_at?: string;
  submitted_by?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;

  // Publication
  published_at?: string;
  sold_at?: string;
  archived_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Create product request
 *
 * Matches: apps/api/src/prosell/application/dto/product/create.py
 */
export interface CreateProductRequest {
  title: string;
  price_cents: number;
  tenant_id: string;
  organization_id: string;
  category_id: string;
  slug?: string;
  description?: string;
  currency?: string;
  condition?: 'new' | 'used' | 'refurbished';
  attributes: ProductAttributes;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
}

/**
 * Update product request
 */
export interface UpdateProductRequest {
  title?: string;
  description?: string;
  price_cents?: number;
  condition?: 'new' | 'used' | 'refurbished';
  attributes?: ProductAttributes;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
}

/**
 * Product list response
 */
export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Product with vehicle data extracted from attributes
 * Convenience type for vehicle-specific views
 */
export interface ProductWithVehicle extends Product {
  attributes: VehicleAttributes;
}

/**
 * Type guard to check if product is a vehicle
 */
export function isVehicleProduct(product: Product): product is ProductWithVehicle {
  return product.attributes.category === 'vehicle';
}

// Re-export ProductAttributes for convenience
export type { ProductAttributes, VehicleAttributes } from './vehicle';
