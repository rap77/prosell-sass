/**
 * Lead Test Data Factory
 *
 * Generates independent test data for lead entities.
 * Each test gets fresh data with unique IDs, emails, phones.
 *
 * Contract Validation (Layer 2):
 * - buyer_name: required, string, 1-255 chars
 * - buyer_email: optional, valid email format
 * - buyer_phone: optional, string, phone format
 * - message: optional, string, 1-5000 chars
 * - source: required, enum (facebook, website, manual)
 * - status: required, enum (new, contacted, qualified, lost, converted)
 * - vehicle: optional, nested object with vehicle data
 */

import { BaseFactory } from './base-factory';

export interface LeadVehicle {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
}

export interface LeadData {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  vehicle: LeadVehicle | null;
  message: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'lost' | 'converted';
  source: 'facebook' | 'website' | 'manual';
  created_at: string;
  updated_at: string;
}

export class LeadFactory extends BaseFactory<LeadData> {
  /**
   * Create valid lead with unique values.
   * Each call generates different ID, email, phone.
   */
  create(overrides?: Partial<LeadData>): LeadData {
    const id = this.generateId('lead');
    const buyerName = `Test Customer ${this.counter}`;
    const buyerEmail = this.generateEmail('buyer');
    const buyerPhone = this.generatePhone();
    const now = this.generateDateTime();

    return {
      id,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      vehicle: null, // Default to null since vehicles table doesn't exist
      message: 'Interested in this vehicle',
      status: 'new',
      source: 'facebook',
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  /**
   * Create invalid lead for negative testing.
   * Violates validation rules (missing required fields, invalid formats).
   */
  createInvalid(): LeadData {
    return {
      id: '', // Invalid: empty ID
      buyer_name: '', // Invalid: empty name
      buyer_email: 'invalid-email', // Invalid: bad email format
      buyer_phone: 'not-a-phone', // Invalid: bad phone format
      vehicle: null,
      message: 'x'.repeat(5001), // Invalid: exceeds 5000 char limit
      // @ts-expect-error intentionally invalid enum value for validation testing
      status: 'invalid',
      // @ts-expect-error intentionally invalid enum value for validation testing
      source: 'invalid',
      created_at: 'not-a-date', // Invalid: bad datetime format
      updated_at: 'not-a-date',
    };
  }

  /**
   * Create edge case lead for boundary testing.
   * Tests minimum/maximum values, special characters, etc.
   */
  createEdgeCase(): LeadData {
    const id = this.generateId('lead');
    const now = this.generateDateTime();
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits for uniqueness

    return {
      id,
      buyer_name: `Ñoño García-López III-${timestamp}`, // Special chars + unique suffix
      buyer_email: `buyer+test-${timestamp}@example.com`, // Email with plus sign + unique
      buyer_phone: `+1 (555) ${timestamp.slice(-4)}`, // Phone with formatting + unique
      vehicle: {
        id: this.generateUUID(), // Generate valid UUID v4
        title: ' vehicle '.repeat(50), // Very long title
        make: 'ÆØÅ', // Special unicode chars
        model: 'Model™ ©®', // Trademark symbols
        year: new Date().getFullYear(), // Current year
      },
      message: 'Test with emojis: 🚗 💨 \nNewlines and \t tabs', // Emojis and whitespace
      status: 'new',
      source: 'manual',
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Create multiple leads with sequential unique values.
   * Useful for testing pagination, list views, search.
   */
  createBatch(count: number, overrides?: Partial<LeadData>): LeadData[] {
    const leads: LeadData[] = [];
    for (let i = 0; i < count; i++) {
      const lead = this.create({
        ...overrides,
        // Override with batch-specific data if needed
        buyer_name: `Batch Customer ${i + 1}`,
      });
      leads.push(lead);
    }
    return leads;
  }

  /**
   * Create lead with specific status.
   * Convenience method for status-based filtering tests.
   */
  createWithStatus(
    status: LeadData['status'],
    overrides?: Partial<LeadData>
  ): LeadData {
    return this.create({ ...overrides, status });
  }

  /**
   * Create lead with specific source.
   * Convenience method for source-based filtering tests.
   */
  createWithSource(
    source: LeadData['source'],
    overrides?: Partial<LeadData>
  ): LeadData {
    return this.create({ ...overrides, source });
  }

  /**
   * Create lead with vehicle data.
   * Convenience method for vehicle association tests.
   */
  createWithVehicle(vehicle: LeadVehicle, overrides?: Partial<LeadData>): LeadData {
    return this.create({ ...overrides, vehicle });
  }

  /**
   * Create unread lead (created < 5 minutes ago).
   * For testing unread highlight functionality.
   */
  createUnread(overrides?: Partial<LeadData>): LeadData {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    return this.create({
      ...overrides,
      created_at: twoMinutesAgo.toISOString(),
      updated_at: twoMinutesAgo.toISOString(),
    });
  }

  /**
   * Create stale lead (created > 24 hours ago).
   * For testing aging/followup logic.
   */
  createStale(overrides?: Partial<LeadData>): LeadData {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    return this.create({
      ...overrides,
      created_at: yesterday.toISOString(),
      updated_at: yesterday.toISOString(),
      status: 'new',
    });
  }
}
