/**
 * Appointment Test Data Factory
 *
 * Generates independent test data for appointment entities.
 * Each test gets fresh data with unique IDs, valid datetime ranges.
 *
 * Contract Validation (Layer 2):
 * - lead_id: required, valid UUID
 * - dealer_id: required, valid UUID
 * - vehicle_id: required, valid UUID
 * - scheduled_at: required, ISO datetime, must be in future
 * - status: required, enum (scheduled, completed, cancelled, no_show)
 * - notes: optional, string, 0-2000 chars
 */

import { BaseFactory } from './base-factory';

export interface AppointmentData {
  id: string;
  lead_id: string;
  dealer_id: string;
  vehicle_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class AppointmentFactory extends BaseFactory<AppointmentData> {
  /**
   * Create valid appointment in the future.
   * Each call generates unique IDs and future datetime.
   */
  create(overrides?: Partial<AppointmentData>): AppointmentData {
    const id = this.generateId('apt');
    const leadId = this.generateId('lead');
    const dealerId = this.generateId('dealer');
    const vehicleId = this.generateId('veh');
    const now = this.generateDateTime();
    const tomorrow = this.generateDateTime(24 * 60); // 24 hours from now

    return {
      id,
      lead_id: leadId,
      dealer_id: dealerId,
      vehicle_id: vehicleId,
      scheduled_at: tomorrow,
      status: 'scheduled',
      notes: 'Test appointment',
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  /**
   * Create invalid appointment for negative testing.
   * Violates validation rules (past datetime, missing IDs, invalid status).
   */
  createInvalid(): AppointmentData {
    const yesterday = this.generateDateTime(-24 * 60); // 24 hours ago

    return {
      id: '', // Invalid: empty ID
      lead_id: 'not-a-uuid', // Invalid: bad UUID format
      dealer_id: '', // Invalid: empty dealer ID
      vehicle_id: 'also-not-a-uuid', // Invalid: bad UUID format
      scheduled_at: yesterday, // Invalid: appointment in past
      status: 'invalid' as any, // Invalid: not in enum
      notes: 'x'.repeat(2001), // Invalid: exceeds 2000 char limit
      created_at: 'not-a-date',
      updated_at: 'not-a-date',
    };
  }

  /**
   * Create edge case appointment for boundary testing.
   * Tests minimum datetime, special characters, etc.
   */
  createEdgeCase(): AppointmentData {
    const id = this.generateId('apt');
    const now = new Date();
    // Appointment exactly 1 minute in future (minimum valid time)
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);

    return {
      id,
      lead_id: this.generateId('lead'),
      dealer_id: this.generateId('dealer'),
      vehicle_id: this.generateId('veh'),
      scheduled_at: oneMinuteFromNow.toISOString(),
      status: 'scheduled',
      notes: 'Test with special chars: ñ é ü \nNewlines and \t tabs', // Special chars, whitespace
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  /**
   * Create multiple appointments with sequential datetimes.
   * Useful for testing calendar views and time slot logic.
   */
  createBatch(count: number, overrides?: Partial<AppointmentData>): AppointmentData[] {
    const appointments: AppointmentData[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const scheduledAt = new Date(now.getTime() + (i + 1) * 60 * 60 * 1000); // 1 hour apart
      const apt = this.create({
        ...overrides,
        scheduled_at: scheduledAt.toISOString(),
      });
      appointments.push(apt);
    }

    return appointments;
  }

  /**
   * Create appointment with specific status.
   * Convenience method for status-based filtering tests.
   */
  createWithStatus(
    status: AppointmentData['status'],
    overrides?: Partial<AppointmentData>
  ): AppointmentData {
    return this.create({ ...overrides, status });
  }

  /**
   * Create appointment for specific datetime.
   * Convenience method for calendar view tests.
   */
  createAt(
    scheduledAt: Date | string,
    overrides?: Partial<AppointmentData>
  ): AppointmentData {
    const datetime = typeof scheduledAt === 'string'
      ? scheduledAt
      : scheduledAt.toISOString();

    return this.create({
      ...overrides,
      scheduled_at: datetime,
    });
  }

  /**
   * Create appointment on specific weekday.
   * Useful for testing business day logic.
   */
  createOnWeekday(
    weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6, // 0 = Sunday, 1 = Monday, etc.
    hour: number = 10, // 10 AM default
    overrides?: Partial<AppointmentData>
  ): AppointmentData {
    const now = new Date();
    const targetDate = new Date(now);

    // Find next occurrence of specified weekday
    const daysUntilWeekday = (weekday - now.getDay() + 7) % 7 || 7;
    targetDate.setDate(now.getDate() + daysUntilWeekday);
    targetDate.setHours(hour, 0, 0, 0);

    return this.create({
      ...overrides,
      scheduled_at: targetDate.toISOString(),
    });
  }

  /**
   * Create appointment for Monday at 10 AM.
   * Common business hour slot.
   */
  createMonday(overrides?: Partial<AppointmentData>): AppointmentData {
    return this.createOnWeekday(1, 10, overrides);
  }

  /**
   * Create past-due appointment (should show as missed).
   * For testing appointment aging logic.
   */
  createPastDue(overrides?: Partial<AppointmentData>): AppointmentData {
    const yesterday = this.generateDateTime(-24 * 60);

    return this.create({
      ...overrides,
      scheduled_at: yesterday,
      status: 'scheduled', // Still marked as scheduled but in past
    });
  }

  /**
   * Create appointment for specific lead and dealer.
   * Convenience method for relationship testing.
   */
  createForEntities(
    leadId: string,
    dealerId: string,
    vehicleId: string,
    overrides?: Partial<AppointmentData>
  ): AppointmentData {
    return this.create({
      ...overrides,
      lead_id: leadId,
      dealer_id: dealerId,
      vehicle_id: vehicleId,
    });
  }

  /**
   * Create completed appointment with notes.
   * For testing appointment completion flow.
   */
  createCompleted(overrides?: Partial<AppointmentData>): AppointmentData {
    return this.create({
      ...overrides,
      status: 'completed',
      notes: 'Customer arrived on time. Test drive completed.',
    });
  }

  /**
   * Create cancelled appointment with reason.
   * For testing cancellation flow.
   */
  createCancelled(overrides?: Partial<AppointmentData>): AppointmentData {
    return this.create({
      ...overrides,
      status: 'cancelled',
      notes: 'Customer cancelled: vehicle sold elsewhere.',
    });
  }
}
