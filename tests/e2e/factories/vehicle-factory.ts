/**
 * Vehicle Test Data Factory
 *
 * Generates independent test data for vehicle entities (C3 catalog model).
 * Each test gets fresh data with unique VINs, product IDs.
 *
 * Contract Validation (Layer 2):
 * - VIN: required, 17 chars, alphanumeric, validates via NHTSA
 * - year: required, integer, 1900-current_year+1
 * - make: required, string, normalized to lowercase (e.g., "chevrolet")
 * - model: required, string, mixed case (e.g., "Equinox")
 * - trim: optional, string (e.g., "LT", "Premier")
 * - body_type: required, normalized to lowercase (e.g., "suv", "pickup")
 * - drivetrain: required, normalized to UPPERCASE (e.g., "FWD", "AWD")
 * - transmission: required, normalized to lowercase (e.g., "automatic")
 * - fuel_type: required, normalized to lowercase (e.g., "gasoline")
 * - price_cents: required, integer >= 0
 * - status: required, enum (draft, published, sold)
 */

import { BaseFactory } from './base-factory';

export interface VehicleData {
  id: string;
  product_id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  body_type: string;
  drivetrain: string;
  transmission: string;
  fuel_type: string;
  engine: string | null;
  dealer_id: string | null;
  dealer_name: string | null;
  price_cents: number | null;
  status: 'draft' | 'published' | 'sold';
  created_at: string;
  updated_at: string;
}

export class VehicleFactory extends BaseFactory<VehicleData> {
  private currentYear = new Date().getFullYear();

  /**
   * Create valid vehicle with unique VIN.
   * VIN format: WMI (3 chars) + attributes (6 chars) + checksum (1 char) + year (1 char) + plant (1 char) + serial (6 chars)
   */
  create(overrides?: Partial<VehicleData>): VehicleData {
    const id = this.generateId('vehicle');
    const productId = this.generateId('prod');
    const vin = this.generateValidVIN();
    const now = this.generateDateTime();

    return {
      id,
      product_id: productId,
      vin,
      year: this.currentYear,
      make: 'toyota',
      model: 'Camry',
      trim: 'LE',
      mileage: 15000,
      exterior_color: 'Midnight Black',
      interior_color: 'Black',
      body_type: 'sedan',
      drivetrain: 'FWD',
      transmission: 'automatic',
      fuel_type: 'gasoline',
      engine: '2.5L I4',
      dealer_id: this.generateId('dealer'),
      dealer_name: 'Test Dealership',
      price_cents: 2799900, // $27,999.00
      status: 'published',
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  /**
   * Generate valid VIN with checksum.
   * Simplified version - not production-grade but valid format.
   */
  private generateValidVIN(): string {
    // WMI codes for common manufacturers
    const wmis = ['1NX', '1HG', '1G1', '2HG', '2T1', '3GCU', '4T1', '5YJ', 'JM1', 'JTD'];
    const wmi = wmis[this.counter % wmis.length];

    // Attributes (6 chars - model, body, engine, etc.)
    const attributes = 'BR32E' + String(this.counter).padStart(6, '0');

    // Checksum (simplified - use digit 0-9)
    const checksum = String(this.counter % 10);

    // Year code (simplified - use H for 2017, J for 2018, etc.)
    const yearCodes = ['H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T'];
    const yearCode = yearCodes[this.counter % yearCodes.length];

    // Plant code (1 char)
    const plant = String.fromCharCode(65 + (this.counter % 26)); // A-Z

    // Serial number (6 chars - numeric)
    const serial = String(this.counter).padStart(6, '0');

    return `${wmi}${attributes}${checksum}${yearCode}${plant}${serial}`;
  }

  /**
   * Create invalid vehicle for negative testing.
   * Violates validation rules (bad VIN, past year, invalid format).
   */
  createInvalid(): VehicleData {
    return {
      id: '', // Invalid: empty ID
      product_id: 'not-a-uuid', // Invalid: bad UUID format
      vin: 'INVALID-VIN-!!!', // Invalid: bad characters, wrong length
      year: 1900, // Invalid: too old
      make: '', // Invalid: empty make
      model: '', // Invalid: empty model
      trim: null,
      mileage: -1, // Invalid: negative mileage
      exterior_color: '',
      interior_color: '',
      body_type: '', // Invalid: empty body type
      drivetrain: 'invalid', // Invalid: not in enum
      transmission: '',
      fuel_type: '',
      engine: null,
      dealer_id: '',
      dealer_name: null,
      price_cents: -100, // Invalid: negative price
      status: 'invalid' as any, // Invalid: not in enum
      created_at: 'not-a-date',
      updated_at: 'not-a-date',
    };
  }

  /**
   * Create edge case vehicle for boundary testing.
   * Tests minimum/maximum years, special characters, etc.
   */
  createEdgeCase(): VehicleData {
    const id = this.generateId('vehicle');
    const now = this.generateDateTime();

    return {
      id,
      product_id: this.generateId('prod'),
      vin: '2GNALCEK' + 'X'.repeat(10), // Valid format but edge case
      year: this.currentYear + 1, // Next year (future model)
      make: 'ÆØÅ', // Special unicode chars
      model: 'Model™ ©®', // Trademark symbols
      trim: 'trim with spaces and - dashes',
      mileage: 0, // Minimum valid mileage (new car)
      exterior_color: 'Pearl White III - Metallic',
      interior_color: 'Black / Gray Leather',
      body_type: 'suv', // Lowercase (normalized)
      drivetrain: 'AWD', // Uppercase (normalized)
      transmission: 'automatic', // Lowercase (normalized)
      fuel_type: 'hybrid', // Lowercase (normalized)
      engine: '2.5L I4 Hybrid',
      dealer_id: this.generateId('dealer'),
      dealer_name: 'Ñoño García-López Motors',
      price_cents: 99999999, // Maximum realistic price
      status: 'published',
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Create multiple vehicles with different makes/models.
   * Useful for testing catalog views and filtering.
   */
  createBatch(count: number, overrides?: Partial<VehicleData>): VehicleData[] {
    const vehicles: VehicleData[] = [];
    const makes = ['toyota', 'chevrolet', 'honda', 'ford', 'nissan'];
    const models = {
      toyota: ['Camry', 'Corolla', 'RAV4', 'Highlander'],
      chevrolet: ['Equinox', 'Malibu', 'Silverado', 'Tahoe'],
      honda: ['Civic', 'Accord', 'CR-V', 'Pilot'],
      ford: ['F-150', 'Escape', 'Explorer', 'Mustang'],
      nissan: ['Altima', 'Sentra', 'Rogue', 'Pathfinder'],
    };

    for (let i = 0; i < count; i++) {
      const make = makes[i % makes.length];
      const modelList = models[make as keyof typeof models];
      const model = modelList[i % modelList.length];

      const vehicle = this.create({
        ...overrides,
        make,
        model,
        vin: this.generateValidVIN(), // Unique VIN per vehicle
      });
      vehicles.push(vehicle);
    }

    return vehicles;
  }

  /**
   * Create vehicle with specific make/model.
   * Convenience method for make/model filtering tests.
   */
  createMakeModel(
    make: string,
    model: string,
    overrides?: Partial<VehicleData>
  ): VehicleData {
    return this.create({
      ...overrides,
      make: make.toLowerCase(), // Normalized to lowercase
      model,
    });
  }

  /**
   * Create Chevrolet Equinox (common test vehicle).
   * VIN: 2GNALCEK1H1615946 (2017 Chevrolet Equinox)
   */
  createChevroletEquinox(overrides?: Partial<VehicleData>): VehicleData {
    return this.create({
      ...overrides,
      vin: '2GNALCEK1H1615946',
      year: 2017,
      make: 'chevrolet',
      model: 'Equinox',
      trim: 'LT',
      body_type: 'suv',
      drivetrain: 'FWD',
      transmission: 'automatic',
      fuel_type: 'gasoline',
      engine: 'LEA',
    });
  }

  /**
   * Create Toyota Camry (common test vehicle).
   * VIN: 4T1BF1FK2GU203567 (2021 Toyota Corolla - similar pattern)
   */
  createToyotaCamry(overrides?: Partial<VehicleData>): VehicleData {
    return this.create({
      ...overrides,
      vin: '4T1BF1FK2GU203567',
      year: 2021,
      make: 'toyota',
      model: 'Camry',
      trim: 'LE',
      body_type: 'sedan',
      drivetrain: 'FWD',
      transmission: 'automatic',
      fuel_type: 'gasoline',
    });
  }

  /**
   * Create pickup truck (tests body_type normalization).
   * Chevrolet Silverado: 3GCUYDED6MG192627
   */
  createPickup(overrides?: Partial<VehicleData>): VehicleData {
    return this.create({
      ...overrides,
      vin: '3GCUYDED6MG192627',
      year: 2021,
      make: 'chevrolet',
      model: 'Silverado',
      trim: '1500',
      body_type: 'pickup',
      drivetrain: '4WD',
      transmission: 'automatic',
      fuel_type: 'gasoline',
    });
  }

  /**
   * Create SUV (tests body_type normalization).
   */
  createSUV(overrides?: Partial<VehicleData>): VehicleData {
    return this.create({
      ...overrides,
      body_type: 'suv',
    });
  }

  /**
   * Create vehicle with specific status.
   * Convenience method for status filtering tests.
   */
  createWithStatus(
    status: VehicleData['status'],
    overrides?: Partial<VehicleData>
  ): VehicleData {
    return this.create({ ...overrides, status });
  }

  /**
   * Create draft vehicle (not yet published).
   */
  createDraft(overrides?: Partial<VehicleData>): VehicleData {
    return this.create({ ...overrides, status: 'draft' });
  }

  /**
   * Create sold vehicle.
   */
  createSold(overrides?: Partial<VehicleData>): VehicleData {
    return this.create({ ...overrides, status: 'sold' });
  }

  /**
   * Create vehicle without dealer assignment.
   * For testing dealer assignment flow.
   */
  createUnassigned(overrides?: Partial<VehicleData>): VehicleData {
    return this.create({
      ...overrides,
      dealer_id: null,
      dealer_name: null,
    });
  }

  /**
   * Create vehicle for specific dealer.
   * For testing dealer catalog views.
   */
  createForDealer(
    dealerId: string,
    dealerName: string,
    overrides?: Partial<VehicleData>
  ): VehicleData {
    return this.create({
      ...overrides,
      dealer_id: dealerId,
      dealer_name: dealerName,
    });
  }
}
