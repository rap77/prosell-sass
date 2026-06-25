/**
 * Zod schemas for the appointments endpoints.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting an
 * `as BackendXResponse` cast on `res.json()` (mirrors the
 * `dealers.ts`/`leads.ts` schema convention).
 */

import { z } from "zod";

/**
 * Appointment status enum - 3-state lifecycle.
 * Lives here (not in appointments.ts) so the schema below can validate
 * it with z.nativeEnum without a circular import; appointments.ts
 * re-exports it.
 */
export enum AppointmentStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export const BackendAppointmentResponseSchema = z
  .object({
    id: z.string(),
    tenant_id: z.string(),
    lead_id: z.string(),
    user_id: z.string(),
    product_id: z.string(),
    scheduled_at: z.string(),
    status: z.nativeEnum(AppointmentStatus),
    notes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const BackendAppointmentListResponseSchema = z.object({
  items: z.array(BackendAppointmentResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type BackendAppointmentResponse = z.infer<
  typeof BackendAppointmentResponseSchema
>;
export type BackendAppointmentListResponse = z.infer<
  typeof BackendAppointmentListResponseSchema
>;
