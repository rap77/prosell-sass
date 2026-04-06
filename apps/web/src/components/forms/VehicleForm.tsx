/**
 * VehicleForm Component
 *
 * Comprehensive form for creating/editing vehicles with VIN decode integration.
 * Organized in sections: VIN, Basic Info, Specifications, Performance, Mileage, Colors, Features.
 *
 * @example
 * ```tsx
 * <VehicleForm mode="create" />
 * <VehicleForm mode="edit" vehicleId={id} initialData={vehicleData} />
 * ```
 */

"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import {
  SelectControlled,
  useFbOptions,
} from "@/components/ui/select-controlled";
import { toast } from "sonner";
import {
  FB_BRANDS,
  FB_BODY_STYLES,
  FB_EXTERIOR_COLORS,
  FB_INTERIOR_COLORS,
  FB_FUEL_TYPES,
  FB_TRANSMISSIONS,
  FB_YEARS,
} from "@/lib/constants/fbVehicleOptions";

// ============================================
// TYPES
// ============================================

export type VehicleFormMode = "create" | "edit";

// ============================================
// SCHEMA
// ============================================

const vehicleSchema = z.object({
  // VIN Section
  vin: z
    .string()
    .min(17, "VIN must be 17 characters")
    .max(17, "VIN must be 17 characters")
    .regex(/^[A-HJ-NPR-Z0-9]+$/, "Invalid VIN format"),

  // Basic Info
  year: z.number().min(1900).max(2030).optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().optional(),

  // Specifications
  body_type: z.string().optional(),
  body_style: z.string().optional(),
  drivetrain: z.string().optional(),
  transmission: z.string().optional(),
  engine: z.string().optional(),
  fuel_type: z.string().optional(),

  // Performance (not required — Facebook doesn't use these)
  mpg_city: z.coerce.number().min(0).optional().nullable(),
  mpg_highway: z.coerce.number().min(0).optional().nullable(),
  mpg_combined: z.coerce.number().min(0).optional().nullable(),

  // Mileage
  mileage: z.number().min(0).optional(),
  mileage_unit: z.enum(["mi", "km"]),

  // Colors
  exterior_color: z.string().optional(),
  interior_color: z.string().optional(),

  // Features
  has_sunroof: z.boolean().optional(),
  has_navigation: z.boolean().optional(),
  has_leather: z.boolean().optional(),
  has_backup_camera: z.boolean().optional(),
  has_bluetooth: z.boolean().optional(),
  has_remote_start: z.boolean().optional(),
  seat_material: z.string().optional(),

  // Additional Info
  stock_number: z.string().optional(),
  description: z.string().max(5000, "Description must be less than 5000 characters").optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;

// ============================================
// PROPS
// ============================================

export interface VehicleFormProps {
  mode?: VehicleFormMode;
  vehicleId?: string;
  initialData?: Partial<VehicleFormValues>;
  onSuccess?: () => void;
  imageUrls?: string[];
  /** Custom submit handler. If provided, overrides default fetch logic. */
  onSubmit?: (data: VehicleFormValues, imageUrls: string[]) => Promise<void>;
}

// ============================================
// COMPONENT
// ============================================

/**
 * VehicleForm component for creating/editing vehicles
 *
 * Features:
 * - VIN decode integration
 * - All 40+ vehicle fields organized in sections
 * - Loading states during submission
 * - Error display with toast notifications
 * - Full accessibility support
 */
export function VehicleForm({
  mode = "create",
  vehicleId,
  initialData,
  onSuccess,
  imageUrls = [],
  onSubmit: customOnSubmit,
}: VehicleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDecodingVin, setIsDecodingVin] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    mode: "onSubmit",
    defaultValues: {
      vin: initialData?.vin ?? "",
      year: initialData?.year != null ? Number(initialData.year) : undefined,
      make: initialData?.make ?? undefined,
      model: initialData?.model ?? "",
      trim: initialData?.trim ?? "",
      body_type: initialData?.body_type ?? undefined,
      body_style: initialData?.body_style ?? "",
      drivetrain: initialData?.drivetrain ?? undefined,
      transmission: initialData?.transmission ?? undefined,
      engine: initialData?.engine ?? "",
      fuel_type: initialData?.fuel_type ?? undefined,
      mpg_city: initialData?.mpg_city != null ? Number(initialData.mpg_city) : undefined,
      mpg_highway: initialData?.mpg_highway != null ? Number(initialData.mpg_highway) : undefined,
      mpg_combined: initialData?.mpg_combined != null ? Number(initialData.mpg_combined) : undefined,
      mileage: initialData?.mileage != null ? Number(initialData.mileage) : undefined,
      mileage_unit: initialData?.mileage_unit ?? "mi",
      exterior_color: initialData?.exterior_color ?? "",
      interior_color: initialData?.interior_color ?? "",
      has_sunroof: initialData?.has_sunroof ?? false,
      has_navigation: initialData?.has_navigation ?? false,
      has_leather: initialData?.has_leather ?? false,
      has_backup_camera: initialData?.has_backup_camera ?? false,
      has_bluetooth: initialData?.has_bluetooth ?? false,
      has_remote_start: initialData?.has_remote_start ?? false,
      seat_material: initialData?.seat_material ?? "",
      stock_number: initialData?.stock_number ?? "",
      description: initialData?.description ?? "",
    },
  });

  // Derived state
  const isDisabled = isSubmitting || isPending;

  // Convert FB options to SelectOption format for SelectControlled
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

  /**
   * Decode VIN and auto-populate fields
   */
  const handleDecodeVin = async () => {
    const vin = watch("vin");

    if (!vin || vin.length !== 17) {
      toast.error("Invalid VIN", {
        description: "VIN must be 17 characters",
      });
      return;
    }

    setIsDecodingVin(true);

    try {
      logger.debug("🚀 Starting VIN decode for:", vin);

      const response = await fetch("/api/v1/vehicles/decode-vin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin }),
      });

      logger.debug("📡 Fetch response status:", response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ VIN decode failed: ${response.status} - ${errorText}`);
        throw new Error("Failed to decode VIN");
      }

      const data = await response.json();
      logger.debug("📦 Raw API response:", data);

      // DEBUG: Log response to verify values match SelectItem keys
      logger.debug("🔍 VIN Decode Response:", data.vehicle);
      logger.debug("🔍 make value:", data.vehicle.make, "type:", typeof data.vehicle.make);
      logger.debug("🔍 body_type value:", data.vehicle.body_type, "type:", typeof data.vehicle.body_type);
      logger.debug("🔍 drivetrain value:", data.vehicle.drivetrain, "type:", typeof data.vehicle.drivetrain);

      // Auto-populate fields from decoded data
      if (data.vehicle) {
        // Update each field individually to preserve existing values
        // Only update fields that have actual values from VIN decode
        // Use != null to catch both null and undefined for numeric fields
        if (data.vehicle.year != null) {
          logger.debug("✅ Setting year:", data.vehicle.year);
          setValue("year", data.vehicle.year, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (data.vehicle.make) {
          logger.debug("✅ Setting make:", data.vehicle.make);
          setValue("make", data.vehicle.make, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (data.vehicle.model) {
          logger.debug("✅ Setting model:", data.vehicle.model);
          setValue("model", data.vehicle.model, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (data.vehicle.trim) {
          logger.debug("✅ Setting trim:", data.vehicle.trim);
          setValue("trim", data.vehicle.trim, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (data.vehicle.body_type) {
          logger.debug("✅ Setting body_type:", data.vehicle.body_type);
          setValue("body_type", data.vehicle.body_type, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (data.vehicle.drivetrain) {
          logger.debug("✅ Setting drivetrain:", data.vehicle.drivetrain);
          setValue("drivetrain", data.vehicle.drivetrain, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (data.vehicle.transmission) {
          logger.debug("✅ Setting transmission:", data.vehicle.transmission);
          setValue("transmission", data.vehicle.transmission, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (data.vehicle.engine) {
          logger.debug("✅ Setting engine:", data.vehicle.engine);
          setValue("engine", data.vehicle.engine, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (data.vehicle.fuel_type) {
          logger.debug("✅ Setting fuel_type:", data.vehicle.fuel_type);
          setValue("fuel_type", data.vehicle.fuel_type, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }

        // DEBUG: Log form state after updates
        setTimeout(() => {
          logger.debug("🔍 Form state after VIN decode:", {
            make: watch("make"),
            body_type: watch("body_type"),
            drivetrain: watch("drivetrain"),
            transmission: watch("transmission"),
            fuel_type: watch("fuel_type"),
          });
        }, 100);
      }

      toast.success("VIN decoded successfully", {
        description: data.cached ? "Loaded from cache" : "Loaded from NHTSA",
      });

      logger.debug("✅ VIN decode completed successfully");
    } catch (error) {
      logger.error("❌ VIN decode error", error);
      toast.error("Failed to decode VIN", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDecodingVin(false);
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (data: VehicleFormValues) => {
    if (isDisabled) {
      return;
    }

    try {
      // If custom submit handler is provided, use it
      if (customOnSubmit) {
        await customOnSubmit(data, imageUrls);
        return;
      }

      // Build request payload
      const payload = {
        ...data,
        images: imageUrls,
      };

      if (mode === "create") {
        const response = await fetch("/api/v1/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: "Failed to create vehicle" }));
          throw new Error(error.message || "Failed to create vehicle");
        }

        const result = await response.json();

        toast.success("Vehicle created", {
          description: "Your vehicle has been successfully added to the catalog.",
        });

        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/catalog");
          router.refresh();
        }
      } else if (mode === "edit" && vehicleId) {
        const response = await fetch(`/api/v1/vehicles/${vehicleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: "Failed to update vehicle" }));
          throw new Error(error.message || "Failed to update vehicle");
        }

        toast.success("Vehicle updated", {
          description: "Your vehicle has been successfully updated.",
        });

        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/catalog");
          router.refresh();
        }
      }
    } catch (err) {
      toast.error("Failed to submit vehicle form", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        // Submit with React transition for concurrent rendering
        startTransition(async () => {
          try {
            await onSubmit(data);
          } catch (err) {
            // Error already handled in onSubmit with toast
          }
        });
      }, (errors) => {
        // Show toast with specific field names
        const fieldLabels: Record<string, string> = {
          vin: "VIN",
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
          mileage: "Odómetro",
          mileage_unit: "Unidad de Millaje",
          exterior_color: "Color Exterior",
          interior_color: "Color Interior",
          stock_number: "Stock Number",
          description: "Descripción",
        };
        const errorFields = Object.keys(errors);
        if (errorFields.length > 0) {
          const fieldNames = errorFields
            .map((f) => fieldLabels[f] || f)
            .join(", ");
          toast.error("Campos incompletos", {
            description: `Completá: ${fieldNames}`,
          });
        }
      })}
      className="flex flex-col gap-8"
      noValidate
    >
      {/* ========================================
          SECTION 1: VIN & Decoding
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">VIN & Identificación</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="vin">
            VIN <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              {...register("vin")}
              id="vin"
              type="text"
              placeholder="1HGCM82633A123456"
              disabled={isDisabled}
              maxLength={17}
              className="uppercase font-mono"
            />
            <Button
              type="button"
              onClick={handleDecodeVin}
              disabled={isDisabled || isDecodingVin}
              variant="outline"
            >
              {isDecodingVin ? "Decoding..." : "Decode VIN"}
            </Button>
          </div>
          {errors.vin && (
            <p className="text-sm text-destructive">{errors.vin.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Ingresa 17 caracteres. El sistema decodificará automáticamente make, model, year, etc.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="stock_number">Stock Number</Label>
            <Input
              {...register("stock_number")}
              id="stock_number"
              type="text"
              placeholder="12345"
              disabled={isDisabled}
            />
          </div>
        </div>
      </section>

      {/* ========================================
          SECTION 2: Basic Info
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Información Básica</h2>

        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="year">Año</Label>
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
                  disabled={isDisabled}
                />
              )}
            />
            {errors.year && (
              <p className="text-sm text-destructive">{errors.year.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="make">Marca</Label>
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
                  disabled={isDisabled}
                />
              )}
            />
            {errors.make && (
              <p className="text-sm text-destructive">{errors.make.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Modelo</Label>
            <Input
              {...register("model")}
              id="model"
              type="text"
              placeholder="Camry, F-150, etc."
              disabled={isDisabled}
            />
            {errors.model && (
              <p className="text-sm text-destructive">{errors.model.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="trim">Trim</Label>
            <Input
              {...register("trim")}
              id="trim"
              type="text"
              placeholder="LE, XSE, Limited, etc."
              disabled={isDisabled}
            />
            {errors.trim && (
              <p className="text-sm text-destructive">{errors.trim.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          SECTION 3: Specifications
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Especificaciones</h2>

        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="body_type">Tipo de Carrocería</Label>
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
                  disabled={isDisabled}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="body_style">Estilo</Label>
            <Input
              {...register("body_style")}
              id="body_style"
              type="text"
              placeholder="4 Door, 2 Door, etc."
              disabled={isDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="drivetrain">Tracción</Label>
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
                    disabled={isDisabled}
                  />
                );
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transmission">Transmisión</Label>
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
                  disabled={isDisabled}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="engine">Motor</Label>
            <Input
              {...register("engine")}
              id="engine"
              type="text"
              placeholder="2.5L 4-Cylinder, V8, etc."
              disabled={isDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fuel_type">Combustible</Label>
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
                  disabled={isDisabled}
                />
              )}
            />
          </div>
        </div>
      </section>

      {/* ========================================
          SECTION 4: Performance
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Rendimiento</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mpg_city">MPG Ciudad</Label>
            <Input
              {...register("mpg_city", {
                setValueAs: (v) => {
                  const n = Number(v);
                  return v === "" || isNaN(n) ? undefined : n;
                },
              })}
              id="mpg_city"
              type="number"
              placeholder="25"
              disabled={isDisabled}
              min={0}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mpg_highway">MPG Carretera</Label>
            <Input
              {...register("mpg_highway", {
                setValueAs: (v) => {
                  const n = Number(v);
                  return v === "" || isNaN(n) ? undefined : n;
                },
              })}
              id="mpg_highway"
              type="number"
              placeholder="32"
              disabled={isDisabled}
              min={0}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mpg_combined">MPG Combinado</Label>
            <Input
              {...register("mpg_combined", {
                setValueAs: (v) => {
                  const n = Number(v);
                  return v === "" || isNaN(n) ? undefined : n;
                },
              })}
              id="mpg_combined"
              type="number"
              placeholder="28"
              disabled={isDisabled}
              min={0}
            />
          </div>
        </div>
      </section>

      {/* ========================================
          SECTION 5: Mileage
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Millaje</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mileage">Odómetro</Label>
            <Input
              {...register("mileage", { valueAsNumber: true })}
              id="mileage"
              type="number"
              placeholder="50000"
              disabled={isDisabled}
              min={0}
            />
            {errors.mileage && (
              <p className="text-sm text-destructive">{errors.mileage.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mileage_unit">Unidad</Label>
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
                  disabled={isDisabled}
                />
              )}
            />
          </div>
        </div>
      </section>

      {/* ========================================
          SECTION 6: Colors
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Colores</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="exterior_color">Color Exterior</Label>
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
                  disabled={isDisabled}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="interior_color">Color Interior</Label>
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
                  disabled={isDisabled}
                />
              )}
            />
          </div>
        </div>
      </section>

      {/* ========================================
          SECTION 7: Features
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Características</h2>

        <div className="grid grid-cols-3 gap-4">
          <Controller
            control={control}
            name="has_sunroof"
            render={({ field }) => (
              <div className="flex items-center gap-2 border p-3 rounded-md">
                <Checkbox
                  id="has_sunroof"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
                <Label htmlFor="has_sunroof" className="cursor-pointer">
                  Techocorrido
                </Label>
              </div>
            )}
          />

          <Controller
            control={control}
            name="has_navigation"
            render={({ field }) => (
              <div className="flex items-center gap-2 border p-3 rounded-md">
                <Checkbox
                  id="has_navigation"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
                <Label htmlFor="has_navigation" className="cursor-pointer">
                  Navegación GPS
                </Label>
              </div>
            )}
          />

          <Controller
            control={control}
            name="has_leather"
            render={({ field }) => (
              <div className="flex items-center gap-2 border p-3 rounded-md">
                <Checkbox
                  id="has_leather"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
                <Label htmlFor="has_leather" className="cursor-pointer">
                  Cuero
                </Label>
              </div>
            )}
          />

          <Controller
            control={control}
            name="has_backup_camera"
            render={({ field }) => (
              <div className="flex items-center gap-2 border p-3 rounded-md">
                <Checkbox
                  id="has_backup_camera"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
                <Label htmlFor="has_backup_camera" className="cursor-pointer">
                  Cámara trasera
                </Label>
              </div>
            )}
          />

          <Controller
            control={control}
            name="has_bluetooth"
            render={({ field }) => (
              <div className="flex items-center gap-2 border p-3 rounded-md">
                <Checkbox
                  id="has_bluetooth"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
                <Label htmlFor="has_bluetooth" className="cursor-pointer">
                  Bluetooth
                </Label>
              </div>
            )}
          />

          <Controller
            control={control}
            name="has_remote_start"
            render={({ field }) => (
              <div className="flex items-center gap-2 border p-3 rounded-md">
                <Checkbox
                  id="has_remote_start"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
                <Label htmlFor="has_remote_start" className="cursor-pointer">
                  Arranque remoto
                </Label>
              </div>
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="seat_material">Material de Asientos</Label>
          <Controller
            control={control}
            name="seat_material"
            render={({ field }) => (
              <SelectControlled
                value={field.value || ""}
                onChange={(val) => field.onChange(val || undefined)}
                options={[
                  { value: "cloth", label: "Tela" },
                  { value: "leather", label: "Cuero" },
                  { value: "vinyl", label: "Vinyl" },
                  { value: "synthetic", label: "Sintético" },
                ]}
                placeholder="Select material"
                id="seat_material"
                disabled={isDisabled}
              />
            )}
          />
        </div>
      </section>

      {/* ========================================
          SECTION 8: Description
          ======================================== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Descripción</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Descripción del Vehículo</Label>
          <Textarea
            {...register("description")}
            id="description"
            placeholder="Describe el estado, características destacadas, historial de mantenimiento, etc."
            disabled={isDisabled}
            rows={5}
            maxLength={5000}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>
      </section>

      {/* ========================================
          SUBMIT BUTTON
          ======================================== */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isDisabled}
          size="lg"
          className="flex-1"
        >
          {isSubmitting ? "Saving..." : mode === "create" ? "Create Vehicle" : "Update Vehicle"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isDisabled}
          size="lg"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
