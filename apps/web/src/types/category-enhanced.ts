/**
 * Enhanced Category Types - Extiende los tipos existentes con features mejoradas.
 *
 * MIGRACIÓN: Reemplaza imports de @/types/category con este archivo.
 * O merge esto con tu archivo existente.
 */

/**
 * AttributeSchemaEntry mejorado - Agrega soporte para:
 * - description (helper text)
 * - required (validación)
 * - placeholder
 */
export interface AttributeSchemaEntryEnhanced {
  type: "string" | "number" | "boolean" | "select";
  label?: string;
  description?: string; // ← NUEVO: Helper text
  required?: boolean; // ← NUEVO: Field requerido
  placeholder?: string; // ← NUEVO: Input placeholder
  group?: string;
  options?: string[];
  // ... otros campos que ya tengas
}

/**
 * Ejemplo de schema mejorado:
 */
export const VEHICLE_SCHEMA_EXAMPLE: Record<
  string,
  AttributeSchemaEntryEnhanced
> = {
  year: {
    type: "number",
    label: "Año",
    description: "Año de fabricación del vehículo",
    required: true,
    group: "basic_info",
  },
  make: {
    type: "string",
    label: "Marca",
    description: "Fabricante del vehículo (ej: Toyota, Ford)",
    required: true,
    placeholder: "Toyota",
    group: "basic_info",
  },
  model: {
    type: "string",
    label: "Modelo",
    required: true,
    group: "basic_info",
  },
  condition: {
    type: "select",
    label: "Condición",
    description: "Estado general del vehículo",
    required: true,
    options: ["Nuevo", "Usado - Excelente", "Usado - Bueno", "Usado - Regular"],
    group: "details",
  },
  color: {
    type: "string",
    label: "Color",
    required: false, // ← Opcional
    group: "details",
  },
};
