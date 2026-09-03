/**
 * Zod schemas for the leads endpoints.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting an
 * `as BackendXResponse` cast on `res.json()`. `z.looseObject()` tolerates
 * backend fields the leads UI doesn't render yet (mirrors the
 * `organizations.ts`/`category.ts` schema convention).
 */

import { z } from "zod";

/**
 * Lead status enum - 5-state lifecycle.
 * Lives here (not in leads.ts) so the Zod schema below can validate it
 * with z.nativeEnum without a circular import; leads.ts re-exports it.
 */
export enum LeadStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  APPOINTMENT_SET = "appointment_set",
  LOST = "lost",
}

const ProductAttributesSchema = z.record(z.string(), z.unknown());

const BackendProductForLeadSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  price_cents: z.number(),
  currency: z.string(),
  status: z.string(),
  attributes: ProductAttributesSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const BackendLeadResponseSchema = z.looseObject({
  id: z.string(),
  tenant_id: z.string(),
  buyer_name: z.string(),
  buyer_email: z.string().nullable(),
  buyer_phone: z.string().nullable(),
  product_id: z.string().nullable(),
  vendedor_id: z.string().nullable(),
  message: z.string().nullable(),
  source: z.string(),
  status: z.enum(LeadStatus),
  created_at: z.string(),
  updated_at: z.string(),
  product: BackendProductForLeadSchema.nullable().optional(),
});

export const BackendLeadListResponseSchema = z.object({
  items: z.array(BackendLeadResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

const LeadAuditLogEntrySchema = z.looseObject({
  id: z.string(),
  lead_id: z.string(),
  old_status: z.enum(LeadStatus),
  new_status: z.enum(LeadStatus),
  changed_by_user_id: z.string().nullable(),
  reason: z.string().nullable(),
  created_at: z.string(),
});

export const BackendLeadDetailResponseSchema = z.object({
  lead: BackendLeadResponseSchema,
  audit_logs: z.array(LeadAuditLogEntrySchema),
});

const VendedorMetricsBreakdownSchema = z.looseObject({
  vendedor_id: z.string(),
  vendedor_name: z.string(),
  total_leads: z.number(),
  new_leads: z.number(),
  conversion_rate: z.number(),
});

export const TeamMetricsResponseSchema = z.looseObject({
  total_leads: z.number(),
  new_leads_last_24h: z.number(),
  conversion_rate: z.number(),
  vendedor_breakdown: z.array(VendedorMetricsBreakdownSchema),
});

const LeadDuplicateMatchSchema = z.looseObject({
  lead_id: z.string(),
  match_type: z.enum(["email", "phone", "both"]),
  confidence: z.enum(["high", "medium", "low"]),
});

export const LeadDuplicatesResponseSchema = z.looseObject({
  lead_id: z.string(),
  duplicates: z.array(LeadDuplicateMatchSchema),
  count: z.number(),
});

export type BackendLeadResponse = z.infer<typeof BackendLeadResponseSchema>;
export type BackendLeadListResponse = z.infer<
  typeof BackendLeadListResponseSchema
>;
export type BackendLeadDetailResponse = z.infer<
  typeof BackendLeadDetailResponseSchema
>;
export type TeamMetricsResponse = z.infer<typeof TeamMetricsResponseSchema>;
export type VendedorMetricsBreakdown = z.infer<
  typeof VendedorMetricsBreakdownSchema
>;
export type LeadDuplicateMatch = z.infer<typeof LeadDuplicateMatchSchema>;
export type LeadDuplicatesResponse = z.infer<
  typeof LeadDuplicatesResponseSchema
>;
