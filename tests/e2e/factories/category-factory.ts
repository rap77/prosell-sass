/**
 * Category Test Data Factory
 *
 * Generates independent test data for category entities (C3 catalog model).
 * Each test gets fresh data with unique slugs and names.
 *
 * Contract Validation (Layer 2):
 * - name: required, string, 1-255 chars, unique
 * - slug: required, string, 1-100 chars, lowercase, URL-safe, unique
 * - attribute_schema: required, object, defines available attributes (year, make, model, vin, etc.)
 * - is_active: required, boolean
 */

import { BaseFactory } from './base-factory';

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  attribute_schema: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class CategoryFactory extends BaseFactory<CategoryData> {
  /**
   * Create valid category with unique slug.
   * Each call generates different ID, name, slug.
   */
  create(overrides?: Partial<CategoryData>): CategoryData {
    const id = this.generateId('cat');
    const name = `Test Category ${this.counter}`;
    const slug = `test-category-${this.counter}`;
    const now = this.generateDateTime();

    return {
      id,
      name,
      slug,
      attribute_schema: {
        year: true,
        make: true,
        model: true,
        vin: true,
        trim: false,
        mileage: true,
        exterior_color: true,
        interior_color: true,
        body_type: true,
        drivetrain: true,
        transmission: true,
        fuel_type: true,
        engine: false,
      },
      is_active: true,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  /**
   * Create invalid category for negative testing.
   * Violates validation rules (empty name, invalid slug, etc.).
   */
  createInvalid(): CategoryData {
    return {
      id: '', // Invalid: empty ID
      name: '', // Invalid: empty name
      slug: 'INVALID SLUG!!!', // Invalid: not URL-safe
      attribute_schema: {}, // Invalid: empty schema
      is_active: false,
      created_at: 'not-a-date',
      updated_at: 'not-a-date',
    };
  }

  /**
   * Create edge case category for boundary testing.
   * Tests special characters, maximum lengths, etc.
   */
  createEdgeCase(): CategoryData {
    const id = this.generateId('cat');
    const now = this.generateDateTime();

    return {
      id,
      name: 'Ñoño García-López Category 123', // Special chars, spaces, numbers
      slug: 'ono-garca-lopez-category-123', // Normalized slug (lowercase, hyphens)
      attribute_schema: {
        year: true,
        make: true,
        model: true,
        vin: true,
        trim: true,
        mileage: true,
        exterior_color: true,
        interior_color: true,
        body_type: true,
        drivetrain: true,
        transmission: true,
        fuel_type: true,
        engine: true,
      },
      is_active: true,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Create multiple categories with different names.
   * Useful for testing category list views.
   */
  createBatch(count: number, overrides?: Partial<CategoryData>): CategoryData[] {
    const categories: CategoryData[] = [];
    const categoryTypes = ['SUVs', 'Sedans', 'Trucks', 'Vans', 'Coupes', 'Convertibles'];

    for (let i = 0; i < count; i++) {
      const name = categoryTypes[i % categoryTypes.length] || `Category ${i + 1}`;
      const slug = name.toLowerCase().replace(/\s+/g, '-');

      const category = this.create({
        ...overrides,
        name,
        slug,
      });
      categories.push(category);
    }

    return categories;
  }

  /**
   * Create SUV category.
   * Common test category with full attribute schema.
   */
  createSUV(overrides?: Partial<CategoryData>): CategoryData {
    return this.create({
      ...overrides,
      name: 'SUVs',
      slug: 'suvs',
      attribute_schema: {
        year: true,
        make: true,
        model: true,
        vin: true,
        trim: true,
        mileage: true,
        exterior_color: true,
        interior_color: true,
        body_type: true,
        drivetrain: true,
        transmission: true,
        fuel_type: true,
        engine: true,
      },
    });
  }

  /**
   * Create Sedan category.
   * Common test category.
   */
  createSedan(overrides?: Partial<CategoryData>): CategoryData {
    return this.create({
      ...overrides,
      name: 'Sedans',
      slug: 'sedans',
      attribute_schema: {
        year: true,
        make: true,
        model: true,
        vin: true,
        trim: true,
        mileage: true,
        exterior_color: true,
        interior_color: true,
        body_type: true,
        drivetrain: true,
        transmission: true,
        fuel_type: true,
        engine: false,
      },
    });
  }

  /**
   * Create Pickup Truck category.
   * Tests body_type normalization.
   */
  createPickup(overrides?: Partial<CategoryData>): CategoryData {
    return this.create({
      ...overrides,
      name: 'Pickup Trucks',
      slug: 'pickup-trucks',
      attribute_schema: {
        year: true,
        make: true,
        model: true,
        vin: true,
        trim: true,
        mileage: true,
        exterior_color: true,
        interior_color: true,
        body_type: true,
        drivetrain: true,
        transmission: true,
        fuel_type: true,
        engine: true,
      },
    });
  }

  /**
   * Create inactive category.
   * For testing category filtering/visibility.
   */
  createInactive(overrides?: Partial<CategoryData>): CategoryData {
    return this.create({
      ...overrides,
      is_active: false,
    });
  }

  /**
   * Create minimal category (fewest attributes).
   * For testing minimal attribute schema.
   */
  createMinimal(overrides?: Partial<CategoryData>): CategoryData {
    return this.create({
      ...overrides,
      attribute_schema: {
        year: true,
        make: true,
        model: true,
        vin: true,
      },
    });
  }
}
