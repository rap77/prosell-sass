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
import { Building2, Loader2, Plus, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
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
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useOrganizations,
  useOrganizationBrokers,
} from "@/lib/api/organizations";
import {
  useCreateProduct,
  useUpdateProduct,
  useProduct,
  useProductImageUrls,
  useProductOwnership,
  useSetProductOwnership,
} from "@/lib/api/products";
import { useImageUploadOptimized } from "@/lib/hooks/useImageUploadOptimized";
import { logger } from "@/lib/logger";
import { useUploadStore, type ImageEntry } from "@/lib/stores/uploadStore";
import type { CategoryNode } from "@/types/category";
import type { ProductAttributes } from "@/types/vehicle";

import { ProductCoverPicker } from "./ProductCoverPicker";
import { buildZodSchema, getSchemaDefaults } from "./schema/buildZodSchema";
import {
  groupFieldsByGroup,
  SchemaFormSection,
} from "./schema/SchemaFormSection";

export const UNIFIED_PRODUCT_FORM_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

export type UnifiedProductFormMode =
  (typeof UNIFIED_PRODUCT_FORM_MODE)[keyof typeof UNIFIED_PRODUCT_FORM_MODE];

export interface UnifiedProductFormProps {
  /** The selected category (with attribute_schema and attribute_groups) */
  category: CategoryNode;
  mode?: UnifiedProductFormMode;
  productId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Fixed fields schema (price, description)
const FIXED_FIELDS_SCHEMA = z.object({
  // The app currently pins Zod 3.25, whose constraint error key is `message`.
  price: z.coerce.number().min(0, { message: "Price must be positive" }),
  description: z.string().max(5000).optional(),
});

const CATEGORY_TYPE = {
  VEHICLE: "vehicle",
  REAL_ESTATE: "real_estate",
  GENERIC: "generic",
} as const;

type CategoryType = (typeof CATEGORY_TYPE)[keyof typeof CATEGORY_TYPE];

function getCategoryType(category: CategoryNode): CategoryType {
  if ("vin" in category.attribute_schema) return CATEGORY_TYPE.VEHICLE;
  if ("operation" in category.attribute_schema)
    return CATEGORY_TYPE.REAL_ESTATE;
  return CATEGORY_TYPE.GENERIC;
}

function isProductAttributes(value: unknown): value is ProductAttributes {
  if (typeof value !== "object" || value === null || !("category" in value)) {
    return false;
  }

  return Object.values(CATEGORY_TYPE).some(
    (categoryType) => value.category === categoryType,
  );
}

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
  owner_type: OwnerType;
  percentage: string;
}

const OWNER_TYPE = {
  ORGANIZATION: "organization",
  USER: "user",
} as const;

type OwnerType = (typeof OWNER_TYPE)[keyof typeof OWNER_TYPE];

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

  // Ownership state shared by create and edit modes.
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [pendingOwners, setPendingOwners] = useState<OwnerEntry[]>([]);
  const [ownershipInitialized, setOwnershipInitialized] = useState(false);
  const [ownershipDirty, setOwnershipDirty] = useState(false);
  const { data: organizations = [] } = useOrganizations();
  const { data: brokers = [], isLoading: isLoadingBrokers } =
    useOrganizationBrokers(selectedOrgId ?? undefined);
  const setOwnership = useSetProductOwnership();
  const { data: existingOwnership, isLoading: isLoadingOwnership } =
    useProductOwnership(mode === "edit" ? productId : undefined);

  // Derive if selected org has brokers
  const selectedOrg = organizations.find((d) => d.id === selectedOrgId);
  const hasBrokers = (selectedOrg?.broker_count ?? 0) > 0;
  const usesBrokerOwners = pendingOwners.some(
    (owner) => owner.owner_type === OWNER_TYPE.USER,
  );
  const ownershipTotal = pendingOwners.reduce(
    (sum, owner) => sum + (parseFloat(owner.percentage) || 0),
    0,
  );
  const ownershipIsValid =
    pendingOwners.length > 0 &&
    pendingOwners.every((owner) => owner.owner_id) &&
    Math.abs(ownershipTotal - 100) < 0.01;

  const updatePendingOwners = (owners: OwnerEntry[]) => {
    setPendingOwners(owners);
    setOwnershipDirty(true);
  };

  const handleOrganizationChange = (organizationId: string) => {
    setSelectedOrgId(organizationId);
    updatePendingOwners([
      {
        owner_id: organizationId,
        owner_type: OWNER_TYPE.ORGANIZATION,
        percentage: "100",
      },
    ]);
  };

  // Hooks
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { uploadImages } = useImageUploadOptimized();
  const clearAll = useUploadStore((s) => s.clearAll);
  const seedImages = useUploadStore((s) => s.seedImages);
  const setCoverImage = useUploadStore((s) => s.setCoverImage);

  // Edit mode: fetch existing product
  const { data: existingProduct, isLoading: isLoadingProduct } = useProduct(
    mode === "edit" ? productId : undefined,
  );
  const { data: existingImageData } = useProductImageUrls(
    mode === "edit" ? productId : undefined,
  );

  // Build schema from category
  // ponytail: useMemo justified — schema derivation walks attribute_schema,
  // expensive on large categories; memo avoids re-derivation on every keystroke
  const { combinedSchema, defaultValues } = useMemo(() => {
    const attrSchema = buildZodSchema(category.attribute_schema);
    const combined = FIXED_FIELDS_SCHEMA.merge(attrSchema);
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

  useEffect(() => {
    if (mode !== "edit" || !existingOwnership || ownershipInitialized) {
      return;
    }

    const owners = existingOwnership.owners.map((owner) => ({
      owner_id: owner.owner_id,
      owner_type: owner.owner_type,
      percentage: owner.percentage,
    }));
    const organizationOwner = owners.find(
      (owner) => owner.owner_type === OWNER_TYPE.ORGANIZATION,
    );

    setPendingOwners(owners);
    setSelectedOrgId(organizationOwner?.owner_id ?? null);
    setOwnershipInitialized(true);
  }, [mode, existingOwnership, ownershipInitialized]);

  // Clear store when productId changes or on create mode
  useEffect(() => {
    clearAll();
  }, [productId, mode, clearAll]);

  // Seed images in edit mode AFTER data arrives
  useEffect(() => {
    // Only seed when we have actual image data (not during loading)
    if (
      mode === "edit" &&
      existingImageData?.images &&
      existingImageData.images.length > 0
    ) {
      logger.debug("Seeding images for edit mode", {
        productId,
        imageCount: existingImageData.images.length,
        coverKey: existingImageData.cover_image_key,
        images: existingImageData.images.map((img) => ({
          key: img.key,
          hasUrl: !!img.url,
        })),
      });
      const entries: ImageEntry[] = existingImageData.images.map((img) => ({
        id: crypto.randomUUID(),
        preview: img.url,
        storageKey: img.key,
        status: "complete" as const,
      }));
      seedImages(entries);

      // ponytail: restore cover from server if it exists
      if (existingImageData.cover_image_key) {
        const coverEntry = entries.find(
          (e) => e.storageKey === existingImageData.cover_image_key,
        );
        if (coverEntry) {
          setCoverImage(coverEntry.id);
        }
      }
    } else if (mode === "edit") {
      logger.debug("Edit mode but no image data yet", {
        productId,
        hasData: !!existingImageData,
        imageCount: existingImageData?.images?.length ?? 0,
      });
    }
  }, [mode, productId, existingImageData, seedImages, setCoverImage]);

  // Group fields
  // ponytail: useMemo justified — group sorting + grouping runs over
  // category.attribute_schema; memo avoids recomputing on every form change
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
    updateProduct.isPending ||
    setOwnership.isPending;
  const isSubmitDisabled = isDisabled || (ownershipDirty && !ownershipIsValid);

  // Submit handler
  const handleImagesUpload = async () => {
    setIsUploadingImages(true);
    try {
      await uploadImages();
    } finally {
      setIsUploadingImages(false);
    }
  };

  const buildProductPayload = (
    data: Record<string, unknown>,
    imageKeys: string[],
    coverKey: string | null,
  ) => {
    const { price, description, ...formAttributes } =
      FIXED_FIELDS_SCHEMA.passthrough().parse(data);

    // ponytail: simple heuristic — vin = vehicle, operation = real estate, else generic
    const categoryType = getCategoryType(category);
    const attributes = { category: categoryType, ...formAttributes };
    if (!isProductAttributes(attributes)) {
      throw new Error("Invalid product attributes");
    }

    const titleTemplate = category.presentation?.title_template;
    const title = generateTitle(titleTemplate, formAttributes) || category.name;

    return {
      title,
      price_cents: Math.round(price * 100),
      description,
      attributes,
      image_urls: imageKeys,
      ...(coverKey ? { cover_image_key: coverKey } : {}),
    };
  };

  const persistOwnership = async (targetProductId: string) => {
    if (pendingOwners.length === 0) return;

    const total = pendingOwners.reduce(
      (sum, o) => sum + (parseFloat(o.percentage) || 0),
      0,
    );
    if (Math.abs(total - 100) >= 0.01) return;

    await setOwnership.mutateAsync({
      productId: targetProductId,
      owners: pendingOwners.map((o) => ({
        owner_id: o.owner_id,
        owner_type: o.owner_type,
        percentage: parseFloat(o.percentage).toFixed(2),
      })),
    });
  };

  const handleCreateProduct = async (
    data: Record<string, unknown>,
    imageKeys: string[],
    coverKey: string | null,
  ) => {
    const payload = buildProductPayload(data, imageKeys, coverKey);
    const newProduct = await createProduct.mutateAsync({
      ...payload,
      category_id: category.id,
      // ponytail: send org for admin cross-org product creation
      ...(selectedOrgId ? { organization_id: selectedOrgId } : {}),
    });

    await persistOwnership(newProduct.id);
    clearAll();
    // ponytail: toast handled by hook (createProduct.onSuccess)

    if (onSuccess) onSuccess();
    else startTransition(() => router.push("/catalog"));
  };

  const handleUpdateProduct = async (
    data: Record<string, unknown>,
    imageKeys: string[],
    coverKey: string | null,
  ) => {
    if (!productId) return;

    const payload = buildProductPayload(data, imageKeys, coverKey);
    await updateProduct.mutateAsync({
      productId,
      data: payload,
    });

    if (ownershipDirty) {
      await persistOwnership(productId);
      setOwnershipDirty(false);
    }

    // ponytail: toast handled by hook (updateProduct.onSuccess)

    if (onSuccess) onSuccess();
    else startTransition(() => router.push("/catalog"));
  };

  const onSubmit = async (data: Record<string, unknown>) => {
    logger.debug("UnifiedProductForm onSubmit", data);

    try {
      await handleImagesUpload();

      const { images, coverImageId } = useUploadStore.getState();
      const imageKeys = images
        .map((e) => e.storageKey)
        .filter((k): k is string => Boolean(k));
      const coverEntry = images.find((e) => e.id === coverImageId);
      const coverKey = coverImageId ? (coverEntry?.storageKey ?? null) : null;

      if (mode === "create") {
        await handleCreateProduct(data, imageKeys, coverKey);
      } else if (mode === "edit") {
        await handleUpdateProduct(data, imageKeys, coverKey);
      }
    } catch (error) {
      setIsUploadingImages(false);
      logger.error("UnifiedProductForm error", error);
      // Toast already shown by mutation hooks
    }
  };

  if (mode === "edit" && (isLoadingProduct || isLoadingOwnership)) {
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

      {/* Ownership (only for admins who can see organizations) */}
      {organizations.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Propietarios</h2>
          <p className="text-sm text-muted-foreground">
            Opcional. Seleccioná una organización. Si tiene brokers, podés
            asignar porcentajes. Si no, la organización es propietaria al 100%.
          </p>

          {/* Step 1: Select Organization */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Organización
            </Label>
            <Select
              value={selectedOrgId ?? undefined}
              onValueChange={handleOrganizationChange}
            >
              <SelectTrigger className="w-full">
                {selectedOrgId ? (
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {selectedOrg?.name}
                    {hasBrokers && (
                      <span className="text-xs text-muted-foreground">
                        ({selectedOrg?.broker_count} brokers)
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Seleccionar organización
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                {organizations.map((organization) => (
                  <SelectItem
                    key={organization.id}
                    value={organization.id}
                    textValue={organization.name}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {organization.name}
                      {(organization.broker_count ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({organization.broker_count} brokers)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Show owners based on org type */}
          {selectedOrgId && (
            <>
              {hasBrokers && usesBrokerOwners ? (
                // Org has brokers — user selects broker owners
                <>
                  {isLoadingBrokers ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando brokers...
                    </div>
                  ) : (
                    <>
                      {pendingOwners.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Seleccioná los brokers propietarios del producto.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {pendingOwners.map((owner, index) => {
                            const selectedBrokerIds = new Set(
                              pendingOwners
                                .filter((o) => o.owner_type === "user")
                                .map((o) => o.owner_id),
                            );
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <Select
                                  value={owner.owner_id || undefined}
                                  onValueChange={(v) => {
                                    const updated = [...pendingOwners];
                                    updated[index] = {
                                      ...updated[index],
                                      owner_id: v,
                                    };
                                    updatePendingOwners(updated);
                                  }}
                                >
                                  <SelectTrigger className="flex-1">
                                    {owner.owner_id ? (
                                      <span className="flex items-center gap-2 truncate">
                                        <User className="h-4 w-4" />
                                        {brokers.find(
                                          (b) => b.id === owner.owner_id,
                                        )?.name ?? owner.owner_id}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        Seleccionar broker
                                      </span>
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brokers
                                      .filter(
                                        (b) =>
                                          b.id === owner.owner_id ||
                                          !selectedBrokerIds.has(b.id),
                                      )
                                      .map((broker) => (
                                        <SelectItem
                                          key={broker.id}
                                          value={broker.id}
                                          textValue={broker.name}
                                        >
                                          <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            {broker.name}
                                            <span className="text-xs text-muted-foreground">
                                              ({broker.email})
                                            </span>
                                            {broker.status === "pending" && (
                                              <span className="text-[10px] text-orange-500">
                                                (pendiente)
                                              </span>
                                            )}
                                          </div>
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
                                      updatePendingOwners(updated);
                                    }}
                                    className="text-right"
                                    disabled={isDisabled}
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    %
                                  </span>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    updatePendingOwners(
                                      pendingOwners.filter(
                                        (_, i) => i !== index,
                                      ),
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
                                {Math.abs(total - 100) >= 0.01 &&
                                  " (debe ser 100%)"}
                              </p>
                            );
                          })()}
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // ponytail: auto-fill remaining percentage to complete 100
                          const used = pendingOwners.reduce(
                            (sum, o) => sum + (parseFloat(o.percentage) || 0),
                            0,
                          );
                          const remaining = Math.max(0, 100 - used);
                          updatePendingOwners([
                            ...pendingOwners,
                            {
                              owner_id: "",
                              owner_type: "user",
                              percentage: String(remaining),
                            },
                          ]);
                        }}
                        disabled={
                          isDisabled || brokers.length === pendingOwners.length
                        }
                        className="w-fit"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar propietario
                      </Button>
                    </>
                  )}
                </>
              ) : (
                // Organization ownership is the default, even when it has brokers.
                <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{selectedOrg?.name}</strong> es el propietario
                    (100%)
                  </span>
                </div>
              )}
              {hasBrokers && !usesBrokerOwners && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updatePendingOwners([
                      {
                        owner_id: "",
                        owner_type: OWNER_TYPE.USER,
                        percentage: "100",
                      },
                    ])
                  }
                  disabled={isDisabled}
                  className="w-fit"
                >
                  <User className="mr-1 h-4 w-4" />
                  Distribuir entre brokers
                </Button>
              )}
            </>
          )}
          {ownershipDirty && !ownershipIsValid && (
            <p className="text-sm text-destructive">
              La distribución de propietarios debe sumar 100% y no puede tener
              propietarios vacíos.
            </p>
          )}
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
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
