import { z } from "zod";

/**
 * Marketplace Access Schemas - cross-org authorization grants.
 * Maps to backend AccessGrantResponse from marketplace_access_router.py
 */

export const MarketplaceAccessGrantSchema = z.object({
  id: z.string().uuid(),
  inventory_owner_organization_id: z.string().uuid(),
  operator_organization_id: z.string().uuid(),
  status: z.enum(["pending", "active", "rejected", "revoked"]),
  can_publish_marketplace: z.boolean(),
  can_manage_inventory: z.boolean(),
  requested_by_user_id: z.string().uuid().nullable(),
  approved_by_user_id: z.string().uuid().nullable(),
  rejected_by_user_id: z.string().uuid().nullable(),
  revoked_by_user_id: z.string().uuid().nullable(),
  requested_at: z.string().datetime(),
  approved_at: z.string().datetime().nullable(),
  rejected_at: z.string().datetime().nullable(),
  revoked_at: z.string().datetime().nullable(),
  rejection_reason: z.string().nullable(),
  revocation_reason: z.string().nullable(),
});

export const MarketplaceAccessListResponseSchema = z.array(
  MarketplaceAccessGrantSchema,
);

export type MarketplaceAccessGrant = z.infer<
  typeof MarketplaceAccessGrantSchema
>;
