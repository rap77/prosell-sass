/**
 * Layer 2 Contract Tests - Vehicle Catalog (C3 Model)
 *
 * Validates VIN decode endpoint with full contract validation:
 * - POST /api/v1/vehicles/decode-vin → NHTSA normalization
 *
 * NOTE: Vehicle CRUD (create, list, update) is implemented under
 * /api/v1/products (not /api/v1/vehicles). Those tests are skipped
 * here to avoid false failures. Test vehicle CRUD via products-api.spec.ts.
 */

import { test, expect } from '@playwright/test';
import { VehicleFactory } from '../factories/index';

const vehicleFactory = new VehicleFactory();

test.describe('Layer 2: Vehicle Catalog (C3 Model) - Contract Validation', () => {
  test.beforeEach(async () => {
    vehicleFactory.reset();
  });

  // ============================================
  // GROUP 1: VIN Decode (POST /api/v1/vehicles/decode-vin)
  // ============================================
  test.describe('POST /api/v1/vehicles/decode-vin - NHTSA Normalization', () => {
    test('L2-VEH-01: should decode 2017 Chevrolet Equinox with normalization', async ({ request }) => {
      const vin = '2GNALBEK8H1615946';

      const response = await request.post('/api/v1/vehicles/decode-vin', {
        data: { vin },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty('vin', vin);
      expect(body).toHaveProperty('vehicle');
      expect(body.vehicle).toHaveProperty('year', 2017);
      expect(body.vehicle).toHaveProperty('make');
      expect(body.vehicle).toHaveProperty('model');
      expect(body.vehicle).toHaveProperty('body_type');
      expect(body.vehicle).toHaveProperty('drivetrain');
      expect(body.vehicle).toHaveProperty('transmission');
      expect(body.vehicle).toHaveProperty('fuel_type');

      // NHTSA normalization contract
      expect(body.vehicle.make).toBe('chevrolet');
      expect(body.vehicle.make).toMatch(/^[a-z_]+$/);

      expect(body.vehicle.model.toLowerCase()).toBe('equinox');

      expect(body.vehicle.body_type).toBe('suv');
      expect(body.vehicle.body_type).toMatch(/^[a-z_]+$/);

      expect(body.vehicle.drivetrain).toBe('FWD');
      expect(body.vehicle.drivetrain).toMatch(/^[A-Z0-9/-]+$/);

      expect(body.vehicle.transmission).toBe('automatic');
      expect(body.vehicle.transmission).toMatch(/^[a-z_-]+$/);

      expect(body.vehicle.fuel_type).toBe('gasoline');
      expect(body.vehicle.fuel_type).toMatch(/^[a-z_-]+$/);
    });

    test('L2-VEH-02: should decode 2021 Chevrolet Silverado pickup', async ({ request }) => {
      const vin = '3GCUYDED6MG192627';

      const response = await request.post('/api/v1/vehicles/decode-vin', {
        data: { vin },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty('vin', vin);
      expect(body.vehicle).toHaveProperty('year', 2021);

      expect(body.vehicle.make).toBe('chevrolet');
      expect(body.vehicle.make).toMatch(/^[a-z]+$/);

      expect(body.vehicle.body_type).toBe('pickup');
      expect(body.vehicle.body_type).toMatch(/^[a-z]+$/);

      expect(body.vehicle.drivetrain).toMatch(/^(4WD|AWD)$/);
      expect(body.vehicle.drivetrain).toMatch(/^[A-Z0-9]+$/);
    });

    test('L2-VEH-03: should reject invalid VIN format', async ({ request }) => {
      const response = await request.post('/api/v1/vehicles/decode-vin', {
        data: { vin: 'INVALID-VIN-!!!' },
      });

      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body).toHaveProperty('detail');
    });

    test('L2-VEH-04: should reject VIN with less than 17 chars', async ({ request }) => {
      const response = await request.post('/api/v1/vehicles/decode-vin', {
        data: { vin: '2GNALBEK8H' },
      });
      expect(response.status()).toBe(422);
    });

    test('L2-VEH-05: should reject VIN with more than 17 chars', async ({ request }) => {
      const response = await request.post('/api/v1/vehicles/decode-vin', {
        data: { vin: '2GNALBEK8H1615946XXX' },
      });
      expect(response.status()).toBe(422);
    });

    test('L2-VEH-06: should handle VIN decode with cached result', async ({ request }) => {
      const vin = '2GNALBEK8H1615946';

      // Second call — should be served from in-memory cache
      const response = await request.post('/api/v1/vehicles/decode-vin', {
        data: { vin },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty('cached', true);
      expect(body.vehicle.make).toBe('chevrolet');
    });
  });

  // ============================================
  // Vehicle CRUD — Implemented under /api/v1/products
  // ============================================
  // NOTE: Tests L2-VEH-07 through L2-VEH-25 test POST/GET /api/v1/vehicles
  // which is NOT the correct path. Vehicle CRUD lives at /api/v1/products.
  // These tests are intentionally excluded to avoid false failures.
  // See products-api.spec.ts for vehicle CRUD contract tests.
});
