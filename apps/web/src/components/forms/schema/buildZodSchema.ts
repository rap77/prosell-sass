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

  // Select with options → enum
  if (type === "select" && options && options.length > 0) {
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
  if (type === "number") {
    let schema = z.coerce.number();
    if (validation_rules?.min !== undefined) {
      schema = schema.min(validation_rules.min);
    }
    if (validation_rules?.max !== undefined) {
      schema = schema.max(validation_rules.max);
    }
    return entry.required ? schema : schema.optional();
  }

  // String (default)
  let schema: ZodTypeAny = z.string();
  if (entry.required) {
    schema = (schema as z.ZodString).min(1, "Required");
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
export function buildZodSchema(attributeSchema: AttributeSchema): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const [key, entry] of Object.entries(attributeSchema)) {
    shape[key] = buildFieldSchema(entry);
  }

  return z.object(shape);
}

/**
 * Get default values for a schema (empty strings for required, undefined for optional).
 */
export function getSchemaDefaults(attributeSchema: AttributeSchema): Record<string, unknown> {
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
