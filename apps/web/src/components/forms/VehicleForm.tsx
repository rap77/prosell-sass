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
import { SelectControlled } from "@/components/ui/select-controlled";
import { toast } from "sonner";
import {
  FB_YEARS,
} from "@/lib/constants/fbVehicleOptions";
import { useCategories, useCategoryOptions } from "@/lib/api/categories";
import { useDecodeVin } from "@/lib/api/vehicles";
import { useCreateProduct } from "@/lib/api/products";
import { useAuthStore } from "@/stores/authStore";
import { VehicleFormAttributes } from "./VehicleFormAttributes";
import { ProductImageGallery } from "@/components/catalog/ProductImageGallery";
import type { Category } from "@/types/category";
import type { VehicleAttributes } from "@/types/vehicle";
import type { ProductImage } from "@/types/product-image";

// ============================================
// TYPES
// ============================================

export type VehicleFormMode = "create" | "edit";

// ============================================
// SCHEMA
// ============================================

const vehicleSchema = z.object({
  // Category
  category_id: z.string().optional(),

  // VIN Section
  vin: z
    .string()
    .min(17, "VIN must be 17 characters")
    .max(17, "VIN must be 17 characters")
    .regex(/^[A-HJ-NPR-Z0-9]+$/, "Invalid VIN format"),

  // Basic Info
  price: z.number().min(0, "Price must be positive"),
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
      category_id: initialData?.category_id ?? "",
      vin: initialData?.vin ?? "",
      price: initialData?.price != null ? Number(initialData.price) : undefined,
      year: initialData?.year != null ? Number(initialData.year) : undefined,
      make: initialData?.make ?? undefined,
      model: initialData?.model ?? "",
      trim: initialData?.trim ?? "",
      body_type: initialData?.body_type ?? undefined,
      body_style: initialData?.body_style ?? "",
      drivetrain: initialData?.drivetrain ?? undefined,
      transmission: initialData?.transmission ?? undefined,
      engine: initialData?.engine,
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

  // Auth context for tenant/org IDs
  const user = useAuthStore((state) => state.user);

  // Category API integration
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: categoryOptions } = useCategoryOptions();
  const selectedCategoryId = watch("category_id");

  // Get selected category object for attribute_schema
  const selectedCategory: Category | undefined = categories?.find(
    (cat) => cat.id === selectedCategoryId
  );

  // VIN decode hook
  const decodeVinMutation = useDecodeVin();

  // Product creation hook (Plan 13-03)
  const createProduct = useCreateProduct();

  // Derived state
  const isDisabled = isSubmitting || isPending;

  /**
   * Decode VIN and auto-populate fields
   * Brain #7 Condition #6: Wait for categories to load before auto-selecting
   */
  const handleDecodeVin = async () => {
    const vin = watch("vin");
    
    logger.debug("🔍 VIN decode requested for:", vin);

    if (!vin || vin.length !== 17) {
      toast.error("Invalid VIN", {
        description: "VIN must be 17 characters",
      });
      return;
    }

    // Brain #7 Condition #6: Wait for categories to load before decoding
    if (categoriesLoading) {
      toast.error("Please wait", {
        description: "Categories are still loading...",
      });
      return;
    }

    setIsDecodingVin(true);

    try {
      logger.debug("🚀 Starting VIN decode for:", vin);

      // Use useDecodeVin mutation
      const decodedVehicle = await decodeVinMutation.mutateAsync(vin);

      logger.debug("📦 Decoded vehicle data:", decodedVehicle);

      // Auto-populate fields from decoded data
      if (decodedVehicle) {
        // Update each field individually to preserve existing values
        // Only update fields that have actual values from VIN decode
        // Use != null to catch both null and undefined for numeric fields
        if (decodedVehicle.year != null) {
          logger.debug("✅ Setting year:", decodedVehicle.year);
          setValue("year", decodedVehicle.year, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (decodedVehicle.make) {
          logger.debug("✅ Setting make:", decodedVehicle.make);
          setValue("make", decodedVehicle.make, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (decodedVehicle.model) {
          logger.debug("✅ Setting model:", decodedVehicle.model);
          setValue("model", decodedVehicle.model, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (decodedVehicle.trim) {
          logger.debug("✅ Setting trim:", decodedVehicle.trim);
          setValue("trim", decodedVehicle.trim, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (decodedVehicle.body_type) {
          logger.debug("✅ Setting body_type:", decodedVehicle.body_type);
          setValue("body_type", decodedVehicle.body_type, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (decodedVehicle.drivetrain) {
          logger.debug("✅ Setting drivetrain:", decodedVehicle.drivetrain);
          setValue("drivetrain", decodedVehicle.drivetrain, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (decodedVehicle.transmission) {
          logger.debug("✅ Setting transmission:", decodedVehicle.transmission);
          setValue("transmission", decodedVehicle.transmission, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (decodedVehicle.engine) {
          logger.debug("✅ Setting engine:", decodedVehicle.engine);
          setValue("engine", decodedVehicle.engine, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        if (decodedVehicle.fuel_type) {
          logger.debug("✅ Setting fuel_type:", decodedVehicle.fuel_type);
          setValue("fuel_type", decodedVehicle.fuel_type, {
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
            engine: watch("engine"),
          });
        }, 100);
      }

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
   * Plan 13-03: Use product creation with auto-vehicle creation
   * Brain #7 Condition #3: Field mapping table documented in PLAN.md
   * 
   * ENTRY POINT DEBUG: This is called when submit button is clicked
   */
  const onSubmit = async (data: VehicleFormValues) => {
    logger.debug("🚀 onSubmit ENTRY POINT - called with data:", data);
    logger.debug("🚀 Form state - isSubmitting:", isSubmitting, "isPending:", isPending, "isDisabled:", isDisabled);
    
    // NOTE: Don't check isDisabled here - it blocks submission!
    // isSubmitting is already true when RHF calls this handler
    // The disabled state on button prevents double-clicks, not this handler

    try {
      // If custom submit handler is provided, use it
      if (customOnSubmit) {
        await customOnSubmit(data, imageUrls);
        return;
      }

      if (mode === "create") {
        logger.debug("🚀 MODE: CREATE - Starting product creation");
        logger.debug("📦 Product data:", {
          title: `${data.year ?? ""} ${data.make ?? ""} ${data.model ?? ""}`.trim(),
          price_cents: Math.round((data.price ?? 0) * 100),
          category_id: data.category_id ?? "",
          vin: data.vin,
        });
        
        // Plan 13-03: Create product with vehicle attributes
        // Backend auto-creates vehicle record when attributes.vin is present
        logger.debug("🌐 Calling createProduct.mutateAsync...");
        const vehicleAttributes: VehicleAttributes = {
          category: "vehicle",
          vin: data.vin,
          year: data.year ?? new Date().getFullYear(),
          make: data.make ?? "",
          model: data.model ?? "",
          mileage: data.mileage ?? 0,
          trim: data.trim,
          body_type: data.body_type,
          drivetrain: data.drivetrain,
          transmission: data.transmission,
          engine: data.engine,
          fuel_type: data.fuel_type,
          mpg_city: data.mpg_city ?? undefined,
          mpg_highway: data.mpg_highway ?? undefined,
          mpg_combined: data.mpg_combined ?? undefined,
          mileage_unit: data.mileage_unit === "mi" ? "miles" : data.mileage_unit,
          exterior_color: data.exterior_color,
          interior_color: data.interior_color,
          has_sunroof: data.has_sunroof,
          has_navigation: data.has_navigation,
          has_leather: data.has_leather,
          has_backup_camera: data.has_backup_camera,
          has_bluetooth: data.has_bluetooth,
          has_remote_start: data.has_remote_start,
          seat_material: data.seat_material,
          stock_number: data.stock_number,
        };

        const product = await createProduct.mutateAsync({
          title: `${data.year ?? ""} ${data.make ?? ""} ${data.model ?? ""}`.trim(),
          price_cents: Math.round((data.price ?? 0) * 100), // Convert dollars to cents
          tenant_id: user?.id ?? "",
          organization_id: user?.organization_id ?? "",
          category_id: data.category_id ?? "",
          description: data.description,
          attributes: vehicleAttributes,
        });

        logger.debug("✅ Product created successfully:", product);
        logger.debug("🎯 Success - calling onSuccess or redirecting to /catalog");

        // Success toast shown by useCreateProduct hook
        if (onSuccess) {
          logger.debug("📞 Calling custom onSuccess callback");
          onSuccess();
        } else {
          logger.debug("📞 Redirecting to /catalog");
          router.push("/catalog");
          router.refresh();
        }
      } else if (mode === "edit" && vehicleId) {
        // TODO: Implement edit mode with product update
        toast.error("Edit mode not yet implemented", {
          description: "Please use the old vehicle form for editing",
        });
      }
    } catch (err) {
      // Log error for debugging
      logger.error("❌ Form submission error:", err);
      
      // Re-throw to ensure form doesn't silently fail
      // Error toast is already shown by useCreateProduct hook's onError
      throw err;
    }
  };

  // ============================================
  // RENDER
  // ============================================

  // Convert imageUrls to ProductImage format for ProductImageGallery
  const productImages: ProductImage[] = (imageUrls || []).map((url, index) => ({
    id: `img-${index}`,
    product_id: vehicleId || '',
    url,
    thumbnail_url: url, // Use same URL for thumbnail (backend will generate thumbnails)
    sort_order: index,
    is_primary: index === 0,
    alt_text: `Image ${index + 1}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        logger.debug("📤 Form submitting with data:", data);
        try {
          await onSubmit(data);
        } catch (err) {
          logger.error("❌ Submit handler error:", err);
          // Don't swallow - let it propagate to error boundary
          throw err;
        }
      }, (errors) => {
        // Show toast with specific field names
        const fieldLabels: Record<string, string> = {
          vin: "VIN",
          price: "Precio",
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
          IMAGE GALLERY (Edit Mode Only)
          ======================================== */}
      {mode === "edit" && productImages.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Imágenes Actuales</h2>
          <ProductImageGallery images={productImages} />
          <p className="text-sm text-muted-foreground">
            Estas son las imágenes actuales del vehículo. Para agregar o reemplazar imágenes, usá el componente de carga de imágenes abajo.
          </p>
        </section>
      )}

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

        <div className="flex flex-col gap-2">
          <Label htmlFor="category_id">Categoría</Label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <SelectControlled
                value={field.value || ""}
                onChange={(val) => field.onChange(val || undefined)}
                options={categoryOptions ?? []}
                placeholder="Selecciona una categoría"
                disabled={isDisabled || categoriesLoading}
                aria-label="Categoría"
              />
            )}
          />
          {errors.category_id && (
            <p className="text-sm text-destructive">{errors.category_id.message}</p>
          )}
        </div>
      </section>

      {/* ========================================
          DYNAMIC ATTRIBUTES (based on category schema)
          ======================================== */}
      <VehicleFormAttributes
        control={control}
        watch={watch}
        disabled={isDisabled}
        selectedCategory={selectedCategory}
      />

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
