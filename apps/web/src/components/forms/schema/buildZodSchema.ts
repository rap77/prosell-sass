/**
 * Runtime Zod schema generator from category.attribute_schema.
 *
 * Generates a Zod object schema that validates product attributes based on
 * the category's attribute_schema definition. Handles:
 * - type → z.string() / z.number() / z.boolean()
 * - required → .optional() or not
 * - validation_rules.min/max → .min() / .max()
 * - select with options → z.enum()
 */

import { z, type ZodTypeAny } from "zod";

import type { AttributeSchemaEntry } from "@/types/category";

type AttributeSchema = Record<string, AttributeSchemaEntry>;

/**
 * Build a Zod schema for a single attribute entry.
 */
function buildFieldSchema(entry: AttributeSchemaEntry): ZodTypeAny {
  const { type, options, validation_rules } = entry;

  // Select with options (string fields only — number fields handle options in UI, not Zod)
  // ponytail: check options array, not type — schema uses filter_type for select
  // ponytail: if field has vin_decode_key, use z.string() instead of z.enum()
  // because VIN decode may return normalized values not in options list
  if (type !== "number" && options && options.length > 0) {
    if (entry.vin_decode_key) {
      // VIN-decoded field: accept any string, UI shows select but backend normalizes
      return entry.required
        ? z.string().min(1, { message: "Required" })
        : z.string().optional();
    }
    const [first, ...rest] = options;
    let schema: ZodTypeAny = z.enum([first, ...rest]);
    if (!entry.required) {
      schema = schema.optional();
    }
    return schema;
  }

  // Boolean
  if (type === "boolean") {
    return z.boolean().optional(); // ponytail: booleans always optional, checkbox UX
  }

  // Number with optional min/max
  // ponytail: preprocess handles empty strings and null → undefined for optional fields
  if (type === "number") {
    let numSchema = z.coerce.number();
    if (validation_rules?.min !== undefined) {
      numSchema = numSchema.min(validation_rules.min);
    }
    if (validation_rules?.max !== undefined) {
      numSchema = numSchema.max(validation_rules.max);
    }

    if (entry.required) {
      return numSchema;
    }
    // Optional: allow empty/null/undefined → skip validation entirely
    return z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      numSchema.optional(),
    );
  }

  // String (default)
  let schema: ZodTypeAny = z.string();
  if (entry.required) {
    schema = (schema as z.ZodString).min(1, { message: "Required" });
  } else {
    schema = schema.optional();
  }
  return schema;
}

/**
 * Build a Zod object schema from an attribute_schema.
 *
 * @param attributeSchema - The category's attribute_schema
 * @returns A Zod object schema for validating product attributes
 */
export function buildZodSchema(
  attributeSchema: AttributeSchema,
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const [key, entry] of Object.entries(attributeSchema)) {
    shape[key] = buildFieldSchema(entry);
  }

  return z.object(shape);
}

/**
 * Get default values for a schema (empty strings for required, undefined for optional).
 */
export function getSchemaDefaults(
  attributeSchema: AttributeSchema,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(attributeSchema)) {
    if (entry.type === "boolean") {
      defaults[key] = false;
    } else if (entry.type === "number") {
      defaults[key] = entry.required ? 0 : undefined;
    } else {
      defaults[key] = entry.required ? "" : undefined;
    }
  }

  return defaults;
}
