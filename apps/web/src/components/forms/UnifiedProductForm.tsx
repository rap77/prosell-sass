"use client";

/**
 * UnifiedProductForm — Schema-driven product form for any category.
 *
 * Replaces the hardcoded ProductForm.tsx with a dynamic form that:
 * - Renders fields from category.attribute_schema
 * - Groups fields by category.attribute_groups
 * - Supports VIN decode for vehicle categories (render_as: "vin_decode")
 * - Validates with runtime-generated Zod schema
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ImageDropzone } from "@/components/upload/ImageDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDealers } from "@/lib/api/dealers";
import {
  useCreateProduct,
  useUpdateProduct,
  useProduct,
  useProductImageUrls,
  useSetProductOwnership,
} from "@/lib/api/products";
import { useImageUploadOptimized } from "@/lib/hooks/useImageUploadOptimized";
import { logger } from "@/lib/logger";
import { useUploadStore, type ImageEntry } from "@/lib/stores/uploadStore";
import type { CategoryNode } from "@/types/category";

import { ProductCoverPicker } from "./ProductCoverPicker";
import { buildZodSchema, getSchemaDefaults } from "./schema/buildZodSchema";
import {
  groupFieldsByGroup,
  SchemaFormSection,
} from "./schema/SchemaFormSection";

export type UnifiedProductFormMode = "create" | "edit";

export interface UnifiedProductFormProps {
  /** The selected category (with attribute_schema and attribute_groups) */
  category: CategoryNode;
  mode?: UnifiedProductFormMode;
  productId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Fixed fields schema (price, description)
const fixedFieldsSchema = z.object({
  price: z.coerce.number().min(0, "Price must be positive"),
  description: z.string().max(5000).optional(),
});

/**
 * Generate a title from the category's title_template and form values.
 * Falls back to category name if no template.
 */
function generateTitle(
  template: string | undefined | null,
  values: Record<string, unknown>,
): string {
  if (!template) return "";
  return template
    .replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""))
    .trim();
}

interface OwnerEntry {
  owner_id: string;
  percentage: string;
}

export function UnifiedProductForm({
  category,
  mode = "create",
  productId,
  onSuccess,
  onCancel,
}: UnifiedProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Ownership state (create mode only)
  const [pendingOwners, setPendingOwners] = useState<OwnerEntry[]>([]);
  const { data: dealers = [] } = useDealers();
  const setOwnership = useSetProductOwnership();

  // Hooks
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { uploadImages } = useImageUploadOptimized();
  const clearAll = useUploadStore((s) => s.clearAll);
  const seedImages = useUploadStore((s) => s.seedImages);

  // Edit mode: fetch existing product
  const { data: existingProduct, isLoading: isLoadingProduct } = useProduct(
    mode === "edit" ? productId : undefined,
  );
  const { data: existingImageData } = useProductImageUrls(
    mode === "edit" ? productId : undefined,
  );

  // Build schema from category
  const { combinedSchema, defaultValues } = useMemo(() => {
    const attrSchema = buildZodSchema(category.attribute_schema);
    const combined = fixedFieldsSchema.merge(attrSchema);
    const defaults = {
      price: 0,
      description: "",
      ...getSchemaDefaults(category.attribute_schema),
    };
    return { combinedSchema: combined, defaultValues: defaults };
  }, [category.attribute_schema]);

  // Form
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(combinedSchema),
    defaultValues,
    mode: "onSubmit",
  });

  // Populate form with existing data in edit mode
  useEffect(() => {
    if (mode === "edit" && existingProduct) {
      const attrs = existingProduct.attributes ?? {};
      reset({
        price: existingProduct.price_cents / 100,
        description: existingProduct.description ?? "",
        ...attrs,
      });
    }
  }, [mode, existingProduct, reset]);

  // Seed images in edit mode
  useEffect(() => {
    if (mode === "edit" && existingImageData?.images?.length) {
      const entries: ImageEntry[] = existingImageData.images.map((img) => ({
        id: crypto.randomUUID(),
        preview: img.url,
        storageKey: img.key,
        status: "complete" as const,
      }));
      seedImages(entries);
    }
  }, [mode, existingImageData, seedImages]);

  // Group fields
  const sortedGroups = useMemo(
    () =>
      [...category.attribute_groups].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      ),
    [category.attribute_groups],
  );
  const fieldsByGroup = useMemo(
    () =>
      groupFieldsByGroup(category.attribute_schema, category.attribute_groups),
    [category.attribute_schema, category.attribute_groups],
  );

  const isDisabled =
    isSubmitting ||
    isPending ||
    isUploadingImages ||
    createProduct.isPending ||
    updateProduct.isPending;

  // Submit handler
  const onSubmit = async (data: Record<string, unknown>) => {
    logger.debug("UnifiedProductForm onSubmit", data);

    try {
      // Upload images
      setIsUploadingImages(true);
      await uploadImages();
      setIsUploadingImages(false);

      const { images, coverImageId } = useUploadStore.getState();
      const imageKeys = images
        .map((e) => e.storageKey)
        .filter((k): k is string => Boolean(k));
      const coverKey = coverImageId
        ? (images.find((e) => e.id === coverImageId)?.storageKey ?? null)
        : null;

      // Extract fixed fields
      const { price, description, ...formAttributes } = data;

      // Determine category type based on schema fields
      // ponytail: simple heuristic — vin = vehicle, operation = real estate, else generic
      const categoryType =
        "vin" in category.attribute_schema
          ? "vehicle"
          : "operation" in category.attribute_schema
            ? "real_estate"
            : "generic";

      const attributes = { category: categoryType, ...formAttributes };

      // Generate title from template
      const titleTemplate = category.presentation?.title_template;
      const title =
        generateTitle(titleTemplate, formAttributes) || category.name;

      if (mode === "create") {
        const newProduct = await createProduct.mutateAsync({
          title,
          price_cents: Math.round((price as number) * 100),
          category_id: category.id,
          description: description as string | undefined,
          // ponytail: cast to ProductAttributes — runtime adds `category` discriminator
          attributes:
            attributes as unknown as import("@/types/vehicle").ProductAttributes,
          image_urls: imageKeys,
          ...(coverKey ? { cover_image_key: coverKey } : {}),
        });

        // Set ownership if any owners were selected
        if (pendingOwners.length > 0) {
          const total = pendingOwners.reduce(
            (sum, o) => sum + (parseFloat(o.percentage) || 0),
            0,
          );
          if (Math.abs(total - 100) < 0.01) {
            await setOwnership.mutateAsync({
              productId: newProduct.id,
              owners: pendingOwners.map((o) => ({
                owner_id: o.owner_id,
                percentage: parseFloat(o.percentage).toFixed(2),
              })),
            });
          }
        }

        clearAll();
        toast.success("Producto creado exitosamente");

        if (onSuccess) {
          onSuccess();
        } else {
          startTransition(() => router.push("/catalog"));
        }
      } else if (mode === "edit" && productId) {
        await updateProduct.mutateAsync({
          productId,
          data: {
            title,
            price_cents: Math.round((price as number) * 100),
            description: description as string | undefined,
            // ponytail: cast to ProductAttributes — runtime adds `category` discriminator
            attributes:
              attributes as unknown as import("@/types/vehicle").ProductAttributes,
            image_urls: imageKeys,
            ...(coverKey ? { cover_image_key: coverKey } : {}),
          },
        });

        toast.success("Producto actualizado exitosamente");

        if (onSuccess) {
          onSuccess();
        } else {
          startTransition(() => router.push("/catalog"));
        }
      }
    } catch (error) {
      setIsUploadingImages(false);
      logger.error("UnifiedProductForm error", error);
      // Toast already shown by mutation hooks
    }
  };

  if (mode === "edit" && isLoadingProduct) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-8 max-w-4xl"
    >
      {/* Images */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Imágenes</h2>
        <ImageDropzone />
        <ProductCoverPicker />
      </section>

      {/* Price (fixed field) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Precio</h2>
        <Controller
          name="price"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2 max-w-xs">
              <Label htmlFor="price">
                Precio (USD) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min={0}
                value={field.value != null ? String(field.value) : ""}
                onChange={(e) =>
                  field.onChange(e.target.value ? Number(e.target.value) : 0)
                }
                disabled={isDisabled}
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
      </section>

      {/* Dynamic sections from attribute_groups */}
      {sortedGroups.map((group, idx) => (
        <SchemaFormSection
          key={group.key}
          group={group}
          fieldKeys={fieldsByGroup[group.key] ?? []}
          schema={category.attribute_schema}
          control={control}
          setValue={setValue}
          disabled={isDisabled}
          defaultOpen={idx < 3}
        />
      ))}

      {/* Ungrouped fields */}
      {fieldsByGroup._ungrouped?.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Otros</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fieldsByGroup._ungrouped.map((key) => (
              <Controller
                key={key}
                name={key}
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={key}>{key}</Label>
                    <Input
                      id={key}
                      value={String(field.value ?? "")}
                      onChange={field.onChange}
                      disabled={isDisabled}
                    />
                  </div>
                )}
              />
            ))}
          </div>
        </section>
      )}

      {/* Description (fixed field) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Descripción</h2>
        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2">
              <Textarea
                id="description"
                value={String(field.value ?? "")}
                onChange={field.onChange}
                disabled={isDisabled}
                rows={4}
                placeholder="Describe el producto..."
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
      </section>

      {/* Ownership (create mode only, only for admins who can see dealers) */}
      {mode === "create" && dealers.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Propietarios</h2>
          <p className="text-sm text-muted-foreground">
            Opcional. Asigná ownership a uno o más dealers. Si no asignás, el
            producto pertenece a tu organización.
          </p>

          {pendingOwners.length > 0 && (
            <div className="space-y-3">
              {pendingOwners.map((owner, index) => {
                const selectedIds = new Set(
                  pendingOwners.map((o) => o.owner_id),
                );
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={owner.owner_id}
                      onValueChange={(v) => {
                        const updated = [...pendingOwners];
                        updated[index] = { ...updated[index], owner_id: v };
                        setPendingOwners(updated);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar dealer" />
                      </SelectTrigger>
                      <SelectContent>
                        {dealers
                          .filter(
                            (d) =>
                              d.id === owner.owner_id || !selectedIds.has(d.id),
                          )
                          .map((dealer) => (
                            <SelectItem
                              key={dealer.id}
                              value={dealer.id}
                              textValue={dealer.name}
                            >
                              {dealer.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <div className="flex w-24 items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={owner.percentage}
                        onChange={(e) => {
                          const updated = [...pendingOwners];
                          updated[index] = {
                            ...updated[index],
                            percentage: e.target.value,
                          };
                          setPendingOwners(updated);
                        }}
                        className="text-right"
                        disabled={isDisabled}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPendingOwners(
                          pendingOwners.filter((_, i) => i !== index),
                        )
                      }
                      className="h-8 w-8 text-destructive"
                      disabled={isDisabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              {/* Total indicator */}
              {(() => {
                const total = pendingOwners.reduce(
                  (sum, o) => sum + (parseFloat(o.percentage) || 0),
                  0,
                );
                return (
                  <p
                    className={`text-sm ${Math.abs(total - 100) < 0.01 ? "text-green-600" : "text-destructive"}`}
                  >
                    Total: {total.toFixed(2)}%
                    {Math.abs(total - 100) >= 0.01 && " (debe ser 100%)"}
                  </p>
                );
              })()}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPendingOwners([
                ...pendingOwners,
                { owner_id: "", percentage: "0" },
              ])
            }
            disabled={isDisabled || dealers.length === pendingOwners.length}
            className="w-fit"
          >
            <Plus className="mr-1 h-4 w-4" />
            Agregar propietario
          </Button>
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isDisabled}>
          {isDisabled ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "Creando..." : "Guardando..."}
            </>
          ) : mode === "create" ? (
            "Crear Producto"
          ) : (
            "Guardar Cambios"
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDisabled}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
