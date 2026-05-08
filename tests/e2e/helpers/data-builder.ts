/**
 * Test Data Builder for E2E tests.
 *
 * Provides utilities to create test data via the real API and track it for cleanup.
 * Uses TestDataBuilder pattern to ensure proper cleanup after tests.
 */

import type { APIRequestContext, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { authenticateAsAdmin } from "./auth";

interface VehicleData {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  price: number;
  status: string;
  images?: string[];
}

interface CategoryData {
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
}

interface LeadData {
  buyer_name: string;
  buyer_email?: string;
  buyer_phone?: string;
  message?: string;
  vehicle_id: string;
}

interface AppointmentData {
  lead_id: string;
  vehicle_id: string;
  dealer_id: string;
  scheduled_at: string; // ISO 8601 format
  notes?: string;
}

/**
 * TestDataBuilder - Creates and tracks test data for E2E tests.
 *
 * Automatically tracks all created entities and provides cleanup functionality.
 * Always call cleanup() in test.afterEach() to prevent database pollution.
 *
 * @example
 * ```typescript
 * test.beforeEach(async ({ request }) => {
 *   builder = new TestDataBuilder(request, tenantId);
 * });
 *
 * test.afterEach(async () => {
 *   await builder.cleanup();
 * });
 *
 * test("creates a vehicle", async () => {
 *   const categoryId = await builder.createCategory("Test SUVs");
 *   const vehicleId = await builder.createVehicle(categoryId, {
 *     vin: "2GNALCEK1H1615946",
 *     year: 2017,
 *     make: "Chevrolet",
 *     model: "Equinox",
 *     // ... other fields
 *   });
 *   // Use vehicleId in test
 * });
 * ```
 */
export class TestDataBuilder {
  private page: Page;
  private tenantId: string;
  private baseUrl: string;

  // Track created entities for cleanup
  private appointmentIds: string[] = [];
  private leadIds: string[] = [];
  private vehicleIds: string[] = [];
  private categoryIds: string[] = [];

  constructor(request: APIRequestContext | Page, tenantId?: string) {
    // Store page if passed, otherwise store request
    if ("request" in request) {
      // It's a Page object
      this.page = request;
    } else {
      // It's an APIRequestContext - wrap in minimal page-like object
      this.page = request as unknown as Page;
    }
    // Use provided tenantId or read from file saved by globalSetup
    if (tenantId) {
      this.tenantId = tenantId;
    } else if (process.env.TEST_TENANT_ID) {
      this.tenantId = process.env.TEST_TENANT_ID;
    } else {
      // Try to read from file saved by globalSetup
      try {
        const fs = require('fs');
        const path = require('path');
        const tenantIdPath = path.join(__dirname, '.auth', 'tenant-id.txt');
        if (fs.existsSync(tenantIdPath)) {
          this.tenantId = fs.readFileSync(tenantIdPath, 'utf-8').trim();
          console.log('[TestDataBuilder] Read tenant_id from file:', this.tenantId);
        } else {
          this.tenantId = randomUUID();
          console.log('[TestDataBuilder] No tenant_id found, using random UUID:', this.tenantId);
        }
      } catch (error) {
        this.tenantId = randomUUID();
        console.log('[TestDataBuilder] Failed to read tenant_id file, using random UUID:', this.tenantId);
      }
    }
    // Use Next.js proxy (localhost:3000) to ensure httpOnly cookies are forwarded correctly.
    // Direct calls to localhost:8000 can fail with SameSite cookie restrictions.
    this.baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  }

  /**
   * Get the request context with auth cookies.
   * Uses page.request if available (includes cookies), otherwise falls back to stored request.
   */
  private get request(): APIRequestContext {
    if ("request" in this.page && typeof this.page.request === "object") {
      // page.request is a property that returns APIRequestContext
      return (this.page as Page).request as unknown as APIRequestContext;
    }
    return this.page as unknown as APIRequestContext;
  }

  /**
   * Create a category via API.
   *
   * @param name - Category name
   * @returns Promise<string> - Category ID
   */
  async createCategory(name: string): Promise<string> {
    const slug = name.toLowerCase().replace(/\s+/g, "-") + `-${Date.now()}`;
    const url = `${this.baseUrl}/api/v1/categories`;

    const response = await this.request.post(url, {
      data: {
        name,
        slug,
        description: `Test category: ${name}`,
        is_active: true,
        attribute_schema: {},
        field_config: [],
        tenant_id: this.tenantId,
      },
    });

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create category '${name}': ${response.status()} - ${errorText}`,
      );
    }

    const data = (await response.json()) as { id: string };
    this.categoryIds.push(data.id);

    // Wait for DB transaction to commit
    if (this.page && typeof this.page.waitForTimeout === 'function') {
      await this.page.waitForTimeout(300);
    }

    return data.id;
  }

  /**
   * Create a vehicle via API.
   *
   * @param categoryId - Category ID (required)
   * @param overrides - Optional vehicle data overrides
   * @returns Promise<string> - Vehicle ID
   */
  async createVehicle(
    categoryId: string,
    overrides?: Partial<VehicleData>,
  ): Promise<string> {
    // Vehicles are managed as products in the API
    const url = `${this.baseUrl}/api/v1/products`;

    // Pool of real 17-char VINs for test data (validated format)
    const TEST_VIN_POOL = [
      "1G1PE5SB6G7175794",  // 2016 Chevrolet Cruze
      "1HGCM82633A123456",  // 2003 Honda Accord
      "2GNALCEK1H1615946",  // 2017 Chevrolet Equinox
      "KMHHU6KH9AU020511",  // 2010 Hyundai Genesis
      "KNAFX4A65E5134820",  // 2014 Kia Forte
      "KNDJP3A5XF7227448",  // 2015 Kia Soul
      "4T1BF1FK2GU203567",  // Toyota
      "1HGCV1F31KA012345",  // 2019 Honda Civic
      "2T1BURHE1GC123456",  // Toyota Corolla
      "1NXBR32E87Z123456",  // Toyota
    ];
    // Use a different VIN per vehicle using counter modulo pool size
    const vinIndex = this.vehicleIds.length % TEST_VIN_POOL.length;
    const defaultVin = TEST_VIN_POOL[vinIndex];
    const vehicleData: VehicleData = {
      vin: defaultVin,
      year: 2020,
      make: "Test Make",
      model: "Test Model",
      trim: "LT",
      mileage: 50000,
      price: 25000,
      status: "available",
      images: [],
      ...overrides,
    };

    const response = await this.request.post(url, {
      data: {
        title: `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`.trim(),
        price_cents: Math.round((vehicleData.price || 0) * 100),
        category_id: categoryId,
        condition: 'used',
        attributes: {
          category: 'vehicle',
          vin: vehicleData.vin,
          year: vehicleData.year,
          make: vehicleData.make,
          model: vehicleData.model,
          trim: vehicleData.trim,
          mileage: vehicleData.mileage,
        },
      },
    });

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create vehicle: ${response.status()} - ${errorText}`,
      );
    }

    const data = (await response.json()) as { id: string };
    this.vehicleIds.push(data.id);
    return data.id;
  }

  /**
   * Create a lead via API.
   *
   * @param vehicleId - Vehicle ID (required)
   * @param overrides - Optional lead data overrides
   * @returns Promise<string> - Lead ID
   */
  async createLead(vehicleId: string, overrides?: Partial<LeadData>): Promise<string> {
    const url = `${this.baseUrl}/api/v1/leads`;

    // Default lead data
    const leadData: LeadData = {
      buyer_name: `Test Buyer ${Date.now()}`,
      buyer_email: `test${Date.now()}@example.com`,
      buyer_phone: "+15550199",
      message: "I am interested in this vehicle",
      vehicle_id: vehicleId,
      ...overrides,
    };

    const response = await this.request.post(url, {
      data: leadData,
    });

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create lead: ${response.status()} - ${errorText}`,
      );
    }

    const data = (await response.json()) as { id: string };
    this.leadIds.push(data.id);
    return data.id;
  }

  /**
   * Create an appointment via API.
   *
   * @param leadId - Lead ID (required)
   * @param vehicleId - Vehicle ID (required)
   * @param dealerId - Dealer/Vendedor ID (required)
   * @param scheduledAt - ISO 8601 datetime string
   * @param overrides - Optional appointment data overrides
   * @returns Promise<string> - Appointment ID
   */
  async createAppointment(
    leadId: string,
    vehicleId: string,
    dealerId: string,
    scheduledAt: string,
    overrides?: Partial<AppointmentData>,
  ): Promise<string> {
    const url = `${this.baseUrl}/api/v1/appointments`;

    const appointmentData: AppointmentData = {
      lead_id: leadId,
      vehicle_id: vehicleId,
      dealer_id: dealerId,
      scheduled_at: scheduledAt,
      ...overrides,
    };

    const response = await this.request.post(url, {
      data: appointmentData,
    });

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create appointment: ${response.status()} - ${errorText}`,
      );
    }

    const data = (await response.json()) as { id: string };
    this.appointmentIds.push(data.id);
    return data.id;
  }

  /**
   * Cleanup all test data created by this builder.
   *
   * Deletes entities in reverse order of creation (appointments → leads → vehicles → categories).
   * Uses the /api/v1/test/cleanup endpoint which performs CASCADE DELETE.
   *
   * MUST be called in test.afterEach() to prevent database pollution.
   *
   * @returns Promise<void>
   */
  async cleanup(): Promise<void> {
    if (
      this.categoryIds.length === 0 &&
      this.vehicleIds.length === 0 &&
      this.leadIds.length === 0 &&
      this.appointmentIds.length === 0
    ) {
      // Nothing to cleanup
      return;
    }

    try {
      const url = `${this.baseUrl}/api/v1/test/cleanup`;
      // Send specific IDs to avoid deleting other parallel tests' data (race condition fix)
      const response = await this.request.delete(url, {
        data: {
          tenant_id: this.tenantId,
          appointment_ids: this.appointmentIds,
          lead_ids: this.leadIds,
          product_ids: this.vehicleIds,
          category_ids: this.categoryIds,
        },
      });

      if (!response.ok()) {
        console.error(
          `Cleanup failed with status ${response.status()}: ${await response.text()}`,
        );
      } else {
        const data = (await response.json()) as {
          success: boolean;
          deleted_counts: Record<string, number>;
        };

        if (data.success) {
          console.log(
            `TestDataBuilder cleanup successful: ${JSON.stringify(data.deleted_counts)}`,
          );
        }
      }

      // Clear tracking arrays even if cleanup failed
      this.categoryIds = [];
      this.vehicleIds = [];
      this.leadIds = [];
      this.appointmentIds = [];
    } catch (error) {
      console.error("Error during cleanup:", error);
      // Still clear tracking arrays to avoid infinite loops
      this.categoryIds = [];
      this.vehicleIds = [];
      this.leadIds = [];
      this.appointmentIds = [];
    }
  }

  /**
   * Get statistics about created test data.
   *
   * Useful for debugging test failures.
   *
   * @returns Promise<Record<string, number>> - Counts of each entity type
   */
  async getStats(): Promise<Record<string, number>> {
    const url = `${this.baseUrl}/api/v1/test/stats/${this.tenantId}`;
    const response = await this.request.get(url);

    if (!response.ok()) {
      console.error(
        `Failed to get stats: ${response.status()} - ${await response.text()}`,
      );
      return {
        categories: this.categoryIds.length,
        vehicles: this.vehicleIds.length,
        leads: this.leadIds.length,
        appointments: this.appointmentIds.length,
      };
    }

    return (await response.json()) as Record<string, number>;
  }
}
