import { z } from "zod";

/**
 * Attribute types supported by the schema-aware bulk upload parser
 * (PR1 backend `CSVProductParser`). Mirrors the backend's `AttributeType`
 * enum — keep in sync.
 */
const AttributeTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "array",
  "object",
]);

/**
 * Single entry of `attribute_schema` (the per-category field definition).
 * Backend stores this in `category.attribute_schema` as a JSONB dict.
 */
export const AttributeFieldSchema = z.object({
  type: AttributeTypeSchema.default("string"),
  required: z.boolean().default(false),
  label: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Wire shape for `GET /api/v1/categories/{id}/schema` and
 * `PATCH /api/v1/categories/{id}/schema` (T7 backend).
 *
 * `migration_warnings` and `requires_force` are populated on PATCH when
 * the change affects existing products; clients must re-send with
 * `?force=true` to apply. Empty array / false on read or additive PATCH.
 */
export const CategorySchemaResponseSchema = z.object({
  attributes: z.record(AttributeFieldSchema),
  schema_version: z.string(),
  updated_at: z.string(),
  migration_warnings: z.array(z.string()).default([]),
  requires_force: z.boolean().default(false),
});

/**
 * Single entry of the audit log returned by
 * `GET /api/v1/categories/{id}/schema/history`.
 */
export const SchemaChangeEntrySchema = z.object({
  id: z.string().uuid(),
  changed_at: z.string(),
  changed_by_user_id: z.string(),
  change_summary: z.string(),
  migration_applied: z.boolean(),
  migration_warnings: z.array(z.string()),
});

export const SchemaHistorySchema = z.array(SchemaChangeEntrySchema);

export type CategorySchemaResponse = z.infer<
  typeof CategorySchemaResponseSchema
>;
export type AttributeField = z.infer<typeof AttributeFieldSchema>;
export type SchemaChangeEntry = z.infer<typeof SchemaChangeEntrySchema>;
