/**
 * Zod schema for POST /api/v1/categories/infer.
 *
 * Validates the wire shape at the HTTP boundary (mirrors the
 * `dealers.ts`/`leads.ts` schema convention).
 */

import { z } from "zod";

export const CategoryInferenceItemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string(),
  score: z.number().min(0).max(1),
});

export const CategoryInferenceResponseSchema = z.object({
  suggestion: CategoryInferenceItemSchema.nullable(),
  alternatives: z.array(CategoryInferenceItemSchema).max(5),
});

export type CategoryInferenceItem = z.infer<typeof CategoryInferenceItemSchema>;
export type CategoryInferenceResponse = z.infer<
  typeof CategoryInferenceResponseSchema
>;
