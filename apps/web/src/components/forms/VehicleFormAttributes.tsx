/**
 * VehicleFormAttributes - Dynamic attribute rendering based on category schema
 *
 * This component renders vehicle fields conditionally based on the selected
 * category's attribute_schema. If no category is selected or schema is empty,
 * all fields are shown.
 */

"use client";

import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SelectControlled, useFbOptions } from "@/components/ui/select-controlled";
import {
  FB_BRANDS,
  FB_BODY_STYLES,
  FB_EXTERIOR_COLORS,
  FB_INTERIOR_COLORS,
  FB_FUEL_TYPES,
  FB_TRANSMISSIONS,
  FB_YEARS,
} from "@/lib/constants/fbVehicleOptions";
import type { VehicleFormValues } from "./VehicleForm";
import type { Category } from "@/types/category";

interface VehicleFormAttributesProps {
  control: any; // Control<T = FieldValues>
  watch: (name: keyof VehicleFormValues) => any;
  disabled: boolean;
  selectedCategory: Category | undefined;
}

/**
 * Mapping of form fields to their label text for testing
 */
export const FIELD_LABELS: Record<string, string> = {
  year: "Año",
  make: "Marca",
  model: "Modelo",
  trim: "Trim",
  body_type: "Tipo de Carrocería",
  body_style: "Estilo",
  drivetrain: "Tracción",
  transmission: "Transmisión",
  engine: "Motor",
  fuel_type: "Combustible",
  mpg_city: "MPG Ciudad",
  mpg_highway: "MPG Carretera",
  mpg_combined: "MPG Combinado",
  mileage: "Odómetro",
  mileage_unit: "Unidad",
  exterior_color: "Color Exterior",
  interior_color: "Color Interior",
  seat_material: "Material de Asientos",
};

/**
 * Check if a field should be visible based on category schema
 *
 * Rules:
 * - If no category selected: show all fields
 * - If category has no attribute_schema: show all fields
 * - If attribute_schema[field] is true: show field
 * - If attribute_schema[field] is false: hide field
 * - If field not in attribute_schema: show field (default behavior)
 */
function shouldShowField(
  fieldName: string,
  selectedCategory: Category | undefined,
): boolean {
  // No category selected -> show all
  if (!selectedCategory) {
    return true;
  }

  // No attribute_schema -> show all
  if (!selectedCategory.attribute_schema || Object.keys(selectedCategory.attribute_schema).length === 0) {
    return true;
  }

  // Check if field is explicitly marked in schema
  const schema = selectedCategory.attribute_schema;
  if (fieldName in schema) {
    return schema[fieldName] === true;
  }

  // Field not in schema -> show by default
  return true;
}

/**
 * VehicleFormAttributes component
 *
 * Renders all vehicle form fields with conditional visibility based on
 * the selected category's attribute_schema.
 */
export function VehicleFormAttributes({
  control,
  watch,
  disabled,
  selectedCategory,
}: VehicleFormAttributesProps) {
  // Convert FB options to SelectOption format
  const brandOptions = useFbOptions(FB_BRANDS);
  const bodyTypeOptions = useFbOptions(FB_BODY_STYLES);
  const transmissionOptions = useFbOptions(FB_TRANSMISSIONS);
  const fuelTypeOptions = useFbOptions(FB_FUEL_TYPES);
  const exteriorColorOptions = useFbOptions(FB_EXTERIOR_COLORS);
  const interiorColorOptions = useFbOptions(FB_INTERIOR_COLORS);
  const yearOptions = FB_YEARS.slice(0, 30).map((year) => ({
    value: String(year),
    label: String(year),
  }));

  return (
    <>
      {/* ========================================
          SECTION 2: Basic Info
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Información Básica</h2>

        <div className="grid grid-cols-4 gap-4">
          {shouldShowField("price", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">
                Precio <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="price"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    id="price"
                    type="number"
                    placeholder="18500"
                    disabled={disabled}
                    min={0}
                    step={0.01}
                  />
                )}
              />
            </div>
          )}

          {shouldShowField("year", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="year">{FIELD_LABELS.year}</Label>
              <Controller
                control={control}
                name="year"
                render={({ field }) => (
                  <SelectControlled
                    value={field.value != null ? String(field.value) : ""}
                    onChange={(val) => field.onChange(val !== "" ? Number(val) : undefined)}
                    options={yearOptions}
                    placeholder="Select year"
                    id="year"
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}

          {shouldShowField("make", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="make">{FIELD_LABELS.make}</Label>
              <Controller
                control={control}
                name="make"
                render={({ field }) => (
                  <SelectControlled
                    value={field.value || ""}
                    onChange={(val) => field.onChange(val || undefined)}
                    options={brandOptions}
                    placeholder="Select make"
                    id="make"
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}

          {shouldShowField("model", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="model">{FIELD_LABELS.model}</Label>
              <Controller
                control={control}
                name="model"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="model"
                    type="text"
                    placeholder="Camry, F-150, etc."
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}

          {shouldShowField("trim", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="trim">{FIELD_LABELS.trim}</Label>
              <Controller
                control={control}
                name="trim"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="trim"
                    type="text"
                    placeholder="LE, XSE, Limited, etc."
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}
        </div>
      </section>

      {/* ========================================
          SECTION 3: Specifications
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Especificaciones</h2>

        <div className="grid grid-cols-4 gap-4">
          {shouldShowField("body_type", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="body_type">{FIELD_LABELS.body_type}</Label>
              <Controller
                control={control}
                name="body_type"
                render={({ field }) => (
                  <SelectControlled
                    value={field.value || ""}
                    onChange={(val) => field.onChange(val || undefined)}
                    options={bodyTypeOptions}
                    placeholder="Select type"
                    id="body_type"
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}

          {shouldShowField("body_style", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="body_style">{FIELD_LABELS.body_style}</Label>
              <Controller
                control={control}
                name="body_style"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="body_style"
                    type="text"
                    placeholder="4 Door, 2 Door, etc."
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}

          {shouldShowField("drivetrain", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="drivetrain">{FIELD_LABELS.drivetrain}</Label>
              <Controller
                control={control}
                name="drivetrain"
                render={({ field }) => {
                  const drivetrainOptions = [
                    { value: "FWD", label: "FWD (Delantera)" },
                    { value: "RWD", label: "RWD (Trasera)" },
                    { value: "AWD", label: "AWD (4x4)" },
                    { value: "4WD", label: "4WD (4x4)" },
                  ];
                  return (
                    <SelectControlled
                      value={field.value || ""}
                      onChange={(val) => field.onChange(val || undefined)}
                      options={drivetrainOptions}
                      placeholder="Select drivetrain"
                      id="drivetrain"
                      disabled={disabled}
                    />
                  );
                }}
              />
            </div>
          )}

          {shouldShowField("transmission", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="transmission">{FIELD_LABELS.transmission}</Label>
              <Controller
                control={control}
                name="transmission"
                render={({ field }) => (
                  <SelectControlled
                    value={field.value || ""}
                    onChange={(val) => field.onChange(val || undefined)}
                    options={transmissionOptions}
                    placeholder="Select transmission"
                    id="transmission"
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {shouldShowField("engine", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="engine">{FIELD_LABELS.engine}</Label>
              <Controller
                control={control}
                name="engine"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="engine"
                    type="text"
                    placeholder="2.5L 4-Cylinder, V8, etc."
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}

          {shouldShowField("fuel_type", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="fuel_type">{FIELD_LABELS.fuel_type}</Label>
              <Controller
                control={control}
                name="fuel_type"
                render={({ field }) => (
                  <SelectControlled
                    value={field.value || ""}
                    onChange={(val) => field.onChange(val || undefined)}
                    options={fuelTypeOptions}
                    placeholder="Select fuel type"
                    id="fuel_type"
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}
        </div>
      </section>

      {/* ========================================
          SECTION 4: Performance
          ======================================== */}
      {shouldShowField("mpg_city", selectedCategory) && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Rendimiento</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mpg_city">{FIELD_LABELS.mpg_city}</Label>
              <Controller
                control={control}
                name="mpg_city"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      field.onChange(e.target.value === "" || isNaN(n) ? undefined : n);
                    }}
                    id="mpg_city"
                    type="number"
                    placeholder="25"
                    disabled={disabled}
                    min={0}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mpg_highway">{FIELD_LABELS.mpg_highway}</Label>
              <Controller
                control={control}
                name="mpg_highway"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      field.onChange(e.target.value === "" || isNaN(n) ? undefined : n);
                    }}
                    id="mpg_highway"
                    type="number"
                    placeholder="32"
                    disabled={disabled}
                    min={0}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mpg_combined">{FIELD_LABELS.mpg_combined}</Label>
              <Controller
                control={control}
                name="mpg_combined"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      field.onChange(e.target.value === "" || isNaN(n) ? undefined : n);
                    }}
                    id="mpg_combined"
                    type="number"
                    placeholder="28"
                    disabled={disabled}
                    min={0}
                  />
                )}
              />
            </div>
          </div>
        </section>
      )}

      {/* ========================================
          SECTION 5: Mileage
          ======================================== */}
      {shouldShowField("mileage", selectedCategory) && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Millaje</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mileage">{FIELD_LABELS.mileage}</Label>
              <Controller
                control={control}
                name="mileage"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    id="mileage"
                    type="number"
                    placeholder="50000"
                    disabled={disabled}
                    min={0}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mileage_unit">{FIELD_LABELS.mileage_unit}</Label>
              <Controller
                control={control}
                name="mileage_unit"
                render={({ field }) => (
                  <SelectControlled
                    value={field.value || ""}
                    onChange={(val) => field.onChange(val || undefined)}
                    options={[
                      { value: "mi", label: "Millas (mi)" },
                      { value: "km", label: "Kilómetros (km)" },
                    ]}
                    placeholder="Select unit"
                    id="mileage_unit"
                    disabled={disabled}
                  />
                )}
              />
            </div>
          </div>
        </section>
      )}

      {/* ========================================
          SECTION 6: Colors
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Colores</h2>

        <div className="grid grid-cols-2 gap-4">
          {shouldShowField("exterior_color", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="exterior_color">{FIELD_LABELS.exterior_color}</Label>
              <Controller
                control={control}
                name="exterior_color"
                render={({ field }) => (
                  <SelectControlled
                    value={field.value || ""}
                    onChange={(val) => field.onChange(val || undefined)}
                    options={exteriorColorOptions}
                    placeholder="Select color"
                    id="exterior_color"
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}

          {shouldShowField("interior_color", selectedCategory) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="interior_color">{FIELD_LABELS.interior_color}</Label>
              <Controller
                control={control}
                name="interior_color"
                render={({ field }) => (
                  <SelectControlled
                    value={field.value || ""}
                    onChange={(val) => field.onChange(val || undefined)}
                    options={interiorColorOptions}
                    placeholder="Select color"
                    id="interior_color"
                    disabled={disabled}
                  />
                )}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
