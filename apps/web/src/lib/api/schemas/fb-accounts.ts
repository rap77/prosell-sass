/**
 * Zod schemas for FB accounts admin endpoints.
 */

import { z } from "zod";

export const FBGroupCategoryEnum = z.enum([
  "vehicles",
  "general",
  "real_estate",
  "electronics",
  "other",
]);

export type FBGroupCategory = z.infer<typeof FBGroupCategoryEnum>;

export const FBGroupSchema = z.object({
  id: z.string(),
  position: z.number(),
  fb_group_id: z.string().nullable(),
  name: z.string().nullable(),
  category: FBGroupCategoryEnum,
  is_active: z.boolean(),
  total_posts: z.number(),
  last_post_at: z.string().nullable(),
});

export type FBGroup = z.infer<typeof FBGroupSchema>;

export const FBAccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  alias: z.string().nullable(),
  broker_id: z.string().nullable(),
  browser: z.string(),
  language: z.string(),
  time_to_sleep: z.union([z.string(), z.number()]),
  status: z.string(),
  groups_count: z.number(),
  total_publications: z.number(),
  total_failures: z.number(),
  last_used_at: z.string().nullable(),
  last_error: z.string().nullable(),
  created_at: z.string(),
});

export type FBAccount = z.infer<typeof FBAccountSchema>;

export const FBAccountDetailSchema = FBAccountSchema.extend({
  groups: z.array(FBGroupSchema),
});

export type FBAccountDetail = z.infer<typeof FBAccountDetailSchema>;

export const FBAccountListResponseSchema = z.array(FBAccountSchema);
