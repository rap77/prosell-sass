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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Performance
  mpg_city: z.number().min(0).optional(),
  mpg_highway: z.number().min(0).optional(),
  mpg_combined: z.number().min(0).optional(),

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
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    mode: "all",
    defaultValues: {
      vin: initialData?.vin || "",
      year: initialData?.year || undefined,
      make: initialData?.make || "",
      model: initialData?.model || "",
      trim: initialData?.trim || "",
      body_type: initialData?.body_type || "",
      body_style: initialData?.body_style || "",
      drivetrain: initialData?.drivetrain || "",
      transmission: initialData?.transmission || "",
      engine: initialData?.engine || "",
      fuel_type: initialData?.fuel_type || "",
      mpg_city: initialData?.mpg_city || undefined,
      mpg_highway: initialData?.mpg_highway || undefined,
      mpg_combined: initialData?.mpg_combined || undefined,
      mileage: initialData?.mileage || undefined,
      mileage_unit: initialData?.mileage_unit || "mi",
      exterior_color: initialData?.exterior_color || "",
      interior_color: initialData?.interior_color || "",
      has_sunroof: initialData?.has_sunroof || false,
      has_navigation: initialData?.has_navigation || false,
      has_leather: initialData?.has_leather || false,
      has_backup_camera: initialData?.has_backup_camera || false,
      has_bluetooth: initialData?.has_bluetooth || false,
      has_remote_start: initialData?.has_remote_start || false,
      seat_material: initialData?.seat_material || "",
      stock_number: initialData?.stock_number || "",
      description: initialData?.description || "",
    },
  });

  // Derived state
  const isDisabled = isSubmitting || isPending;

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
      const response = await fetch("/api/v1/vehicles/decode-vin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin }),
      });

      if (!response.ok) {
        throw new Error("Failed to decode VIN");
      }

      const data = await response.json();

      // Auto-populate fields from decoded data
      if (data.vehicle) {
        if (data.vehicle.year) setValue("year", data.vehicle.year);
        if (data.vehicle.make) setValue("make", data.vehicle.make);
        if (data.vehicle.model) setValue("model", data.vehicle.model);
        if (data.vehicle.trim) setValue("trim", data.vehicle.trim);
        if (data.vehicle.body_type) setValue("body_type", data.vehicle.body_type);
        if (data.vehicle.drivetrain) setValue("drivetrain", data.vehicle.drivetrain);
        if (data.vehicle.transmission) setValue("transmission", data.vehicle.transmission);
        if (data.vehicle.engine) setValue("engine", data.vehicle.engine);
        if (data.vehicle.fuel_type) setValue("fuel_type", data.vehicle.fuel_type);
      }

      toast.success("VIN decoded successfully", {
        description: data.cached ? "Loaded from cache" : "Loaded from NHTSA",
      });
    } catch (error) {
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
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => {
          handleSubmit(onSubmit)(e);
        });
      }}
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
                <Select
                  value={field.value?.toString()}
                  onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {FB_YEARS.slice(0, 30).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="make">
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent>
                    {FB_BRANDS.map((brand) => (
                      <SelectItem key={brand.key} value={brand.key}>
                        {brand.es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="body_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FB_BODY_STYLES.map((style) => (
                      <SelectItem key={style.key} value={style.key}>
                        {style.es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="drivetrain">
                    <SelectValue placeholder="Select drivetrain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FWD">FWD (Delantera)</SelectItem>
                    <SelectItem value="RWD">RWD (Trasera)</SelectItem>
                    <SelectItem value="AWD">AWD (4x4)</SelectItem>
                    <SelectItem value="4WD">4WD (4x4)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transmission">Transmisión</Label>
            <Controller
              control={control}
              name="transmission"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="transmission">
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    {FB_TRANSMISSIONS.map((trans) => (
                      <SelectItem key={trans.key} value={trans.key}>
                        {trans.es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="fuel_type">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FB_FUEL_TYPES.map((fuel) => (
                      <SelectItem key={fuel.key} value={fuel.key}>
                        {fuel.es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              {...register("mpg_city", { valueAsNumber: true })}
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
              {...register("mpg_highway", { valueAsNumber: true })}
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
              {...register("mpg_combined", { valueAsNumber: true })}
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="mileage_unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mi">Millas (mi)</SelectItem>
                    <SelectItem value="km">Kilómetros (km)</SelectItem>
                  </SelectContent>
                </Select>
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="exterior_color">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {FB_EXTERIOR_COLORS.map((color) => (
                      <SelectItem key={color.key} value={color.key}>
                        {color.es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="interior_color">Color Interior</Label>
            <Controller
              control={control}
              name="interior_color"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="interior_color">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {FB_INTERIOR_COLORS.map((color) => (
                      <SelectItem key={color.key} value={color.key}>
                        {color.es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
              >
                <SelectTrigger id="seat_material">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloth">Tela</SelectItem>
                  <SelectItem value="leather">Cuero</SelectItem>
                  <SelectItem value="vinyl">Vinyl</SelectItem>
                  <SelectItem value="synthetic">Sintético</SelectItem>
                </SelectContent>
              </Select>
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
