/**
 * Test Data Factories - Barrel Export
 *
 * Central export point for all test data factories.
 * Use these to generate independent test data in E2E tests.
 *
 * @example
 * ```typescript
 * import { LeadFactory, AppointmentFactory, VehicleFactory } from './factories';
 *
 * const leadFactory = new LeadFactory();
 * const lead = leadFactory.create(); // Fresh data, unique values
 *
 * const aptFactory = new AppointmentFactory();
 * const mondayApt = aptFactory.createMonday(); // Monday at 10 AM
 * ```
 */

export { BaseFactory } from './base-factory';
export {
  LeadFactory,
  type LeadData,
  type LeadVehicle,
} from './lead-factory';
export {
  AppointmentFactory,
  type AppointmentData,
} from './appointment-factory';
export {
  VehicleFactory,
  type VehicleData,
} from './vehicle-factory';
export {
  CategoryFactory,
  type CategoryData,
} from './category-factory';
