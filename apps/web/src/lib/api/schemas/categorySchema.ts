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
 * How the field should be rendered in the product form.
 * Drives the generic form builder's input selection.
 */
export const RenderAsSchema = z.enum([
  "text",
  "textarea",
  "select",
  "number",
  "checkbox",
  "vin_decode",
  "date",
]);
export type RenderAs = z.infer<typeof RenderAsSchema>;

/**
 * One attribute group definition stored in `category.attribute_groups`.
 * Each entry in `attribute_schema` may carry a `group` key referencing
 * one of these by `key`.
 */
export const AttributeGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  order: z.number().default(0),
  /** Optional explicit field ordering for this group. Backend persists as JSONB. */
  fields: z.array(z.string()).optional(),
});

/**
 * Single entry of `attribute_schema` (the per-category field definition).
 * Backend stores this in `category.attribute_schema` as a JSONB dict.
 */
export const AttributeFieldSchema = z.object({
  type: AttributeTypeSchema.default("string"),
  required: z.boolean().default(false),
  label: z.string().optional(),
  description: z.string().optional(),
  group: z.string().optional(),
  /** How to render in product form (default: inferred from type) */
  render_as: RenderAsSchema.optional(),
  /** For render_as="vin_decode": which decoded field to map to */
  vin_decode_key: z.string().optional(),
  /** For render_as="select": the selectable values. Mirrors AttributeSchemaEntry.options. */
  options: z.array(z.union([z.string(), z.number()])).optional(),
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
  attributes: z.record(z.string(), AttributeFieldSchema),
  attribute_groups: z.array(AttributeGroupSchema).default([]),
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

/**
 * Wire shape of the backend's 422 response when PATCH /api/v1/categories/{id}/schema
 * detects breaking type/required changes. The hook throws an Error whose
 * `.message` is the JSON-stringified body — use this schema to safely parse it.
 */
export const MigrationWarningResponseSchema = z.object({
  migration_warnings: z.array(z.string()),
  requires_force: z.boolean().optional(),
});

export type CategorySchemaResponse = z.infer<
  typeof CategorySchemaResponseSchema
>;
export type AttributeField = z.infer<typeof AttributeFieldSchema>;
export type AttributeGroup = z.infer<typeof AttributeGroupSchema>;
export type SchemaChangeEntry = z.infer<typeof SchemaChangeEntrySchema>;
export type MigrationWarningResponse = z.infer<
  typeof MigrationWarningResponseSchema
>;
