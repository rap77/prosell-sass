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
import {
  AlertTriangle,
  Building2,
  Facebook,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { WizardContainer } from "./WizardContainer";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useFBAccounts } from "@/lib/api/fb-accounts";
import {
  useCreateProduct,
  useUpdateProduct,
  useProduct,
  useProductImageUrls,
  useProductOwnership,
  useSetProductBrokers,
} from "@/lib/api/products";
import { useImageUploadOptimized } from "@/lib/hooks/useImageUploadOptimized";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useUploadStore, type ImageEntry } from "@/lib/stores/uploadStore";
import type { Broker } from "@/lib/api/schemas/organizations";
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
  /** Enable wizard UX (default: true). Mobile: sequential steps, Desktop: tabs */
  enableWizard?: boolean;
}

// Fixed fields schema (price, description)
export const FIXED_FIELDS_SCHEMA = z.object({
  // The app currently pins Zod 3.25, whose constraint error key is `message`.
  price: z.coerce.number().min(0, { message: "Price must be positive" }),
  description: z.string().max(5000).optional(),
});

// Loose variant for buildProductPayload's category-attribute extraction below
// (line ~483): that use site needs to tolerate extra category attributes
// alongside price/description, unlike the strict `.merge(attrSchema)` use at
// line ~290, which must keep rejecting unknown top-level fields.
export const FIXED_FIELDS_SCHEMA_LOOSE = z.looseObject({
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

interface BrokerEntry {
  /** Stable ID for React key (not the owner_id, which changes on selection) */
  id: string;
  owner_id: string;
  percentage: string;
}

export function findBrokerByOwnerId(
  brokers: Broker[],
  ownerId: string,
): Broker | undefined {
  // ponytail: match by user_id OR id — brokers without user_id use id as fallback
  return brokers.find((broker) => (broker.user_id ?? broker.id) === ownerId);
}

export function getSelectableBrokers(
  brokers: Broker[],
  selectedOwnerIds: ReadonlySet<string>,
  currentOwnerId: string,
): Broker[] {
  return brokers.filter((broker) => {
    // ponytail: use user_id if linked, otherwise broker.id for pending brokers
    const ownerId = broker.user_id ?? broker.id;
    return ownerId === currentOwnerId || !selectedOwnerIds.has(ownerId);
  });
}

export function UnifiedProductForm({
  category,
  mode = "create",
  productId,
  onSuccess,
  onCancel,
  enableWizard = true,
}: UnifiedProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Tenant cascade (PROP-001):
  //   - `selectedOrgId` is the pending owner organization (products.organization_id).
  //   - `pendingBrokers` is the pending broker shares (product_ownership user rows).
  //   - `orgDirty` is true when the user changed the organization in this session.
  //   - `brokersDirty` is true when the user changed the broker shares in this session.
  // Each dirty flag drives a different endpoint on save.
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [pendingBrokers, setPendingBrokers] = useState<BrokerEntry[]>([]);
  const [orgDirty, setOrgDirty] = useState(false);
  const [brokersDirty, setBrokersDirty] = useState(false);
  // Transfer confirmation dialog state (EDIT mode only)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [pendingTransferOrgId, setPendingTransferOrgId] = useState<
    string | null
  >(null);
  // FB accounts multi-select: null=unchanged, []=any, [ids]=specific
  const [fbAccountsOverride, setFbAccountsOverride] = useState<string[] | null>(
    null,
  );
  const initializedOwnershipProductId = useRef<string | null>(null);
  const { data: organizations = [] } = useOrganizations();
  const { data: brokers = [], isLoading: isLoadingBrokers } =
    useOrganizationBrokers(selectedOrgId ?? undefined);
  const setBrokersApi = useSetProductBrokers();
  const { data: existingOwnership, isLoading: isLoadingOwnership } =
    useProductOwnership(mode === "edit" ? productId : undefined);

  const selectedOrg = organizations.find((d) => d.id === selectedOrgId);
  const pendingTransferOrg = organizations.find(
    (d) => d.id === pendingTransferOrgId,
  );
  const hasBrokers = (selectedOrg?.broker_count ?? 0) > 0;
  // ProSell admins see the org selector; org required in CREATE to avoid orphan products
  const isOrgSelectorVisible = organizations.length > 0;
  const isOrgRequired = mode === "create" && isOrgSelectorVisible;

  const updatePendingBrokers = (newBrokers: BrokerEntry[]) => {
    setPendingBrokers(newBrokers);
    setBrokersDirty(true);
  };

  // Apply org change (called directly in CREATE, or after dialog confirm in EDIT)
  const applyOrganizationChange = (organizationId: string) => {
    setSelectedOrgId(organizationId);
    setOrgDirty(true);
    // Reset broker edits — they belong to the previous org
    setPendingBrokers([]);
    setBrokersDirty(false);
  };

  // In EDIT mode, org changes require confirmation because brokers get deleted
  const handleOrganizationChange = (organizationId: string) => {
    // Guard: Radix Select can fire onValueChange with empty string during
    // controlled/uncontrolled transitions. Ignore empty or same value.
    if (!organizationId || organizationId === selectedOrgId) return;

    if (mode !== "edit" || !selectedOrgId) {
      // CREATE mode or first selection — apply directly
      applyOrganizationChange(organizationId);
      return;
    }

    // EDIT mode with an existing org — show confirmation dialog before applying
    setPendingTransferOrgId(organizationId);
    setTransferDialogOpen(true);
  };

  const confirmTransfer = () => {
    if (pendingTransferOrgId) {
      applyOrganizationChange(pendingTransferOrgId);
    }
    setPendingTransferOrgId(null);
    setTransferDialogOpen(false);
  };

  const cancelTransfer = () => {
    setPendingTransferOrgId(null);
    setTransferDialogOpen(false);
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

  // Derived FB state (must be after existingProduct declaration).
  // published_to_marketplace is now a read-only consequence of approve() —
  // no local override, see docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md
  const isPublishedToFB = existingProduct?.published_to_marketplace ?? false;
  const { data: fbAccounts = [] } = useFBAccounts({});
  // Derived FB accounts: null=not dirty, []=any account, [ids]=specific
  const selectedFbAccounts =
    fbAccountsOverride ?? existingProduct?.fb_account_ids ?? [];
  const fbAccountsDirty = fbAccountsOverride !== null;

  // Build schema from category (React 19 Compiler handles memoization)
  const attrSchema = buildZodSchema(category.attribute_schema);
  const combinedSchema = FIXED_FIELDS_SCHEMA.merge(attrSchema);
  const defaultValues = {
    price: 0,
    description: "",
    ...getSchemaDefaults(category.attribute_schema),
  };

  // Form
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(combinedSchema),
    defaultValues,
    mode: "onSubmit",
  });

  // Debug: log validation errors when they change
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      logger.warn("Form validation errors", errors);
    }
  }, [errors]);

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

  // Reset state when mode changes to non-edit
  useEffect(() => {
    if (mode !== "edit") {
      initializedOwnershipProductId.current = null;
      /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on mode change */
      setPendingBrokers([]);
      setSelectedOrgId(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [mode]);

  // Reset state when switching products in edit mode
  useEffect(() => {
    if (
      mode === "edit" &&
      initializedOwnershipProductId.current !== productId
    ) {
      setPendingBrokers([]);
      setSelectedOrgId(null);
      setOrgDirty(false);
      setBrokersDirty(false);
    }
  }, [mode, productId]);

  // Initialize ownership data when in edit mode
  useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    // Wait for data before initializing
    if (!productId || !existingProduct || !existingOwnership) {
      return;
    }

    // Skip if already initialized for this product
    if (initializedOwnershipProductId.current === productId) {
      return;
    }

    // Existing brokers only (org rows are no longer stored separately).
    const existingBrokers = existingOwnership.owners
      .filter((owner) => owner.owner_type === "user")
      .map((owner) => ({
        id: crypto.randomUUID(),
        owner_id: owner.owner_id,
        percentage: owner.percentage,
      }));

    setPendingBrokers(existingBrokers);
    setSelectedOrgId(existingProduct.organization_id);
    setOrgDirty(false);
    setBrokersDirty(false);
    initializedOwnershipProductId.current = productId;
  }, [mode, productId, existingProduct, existingOwnership]);

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
        // GGA: no 'as const' - ImageEntry.status accepts literal "complete"
        status: "complete",
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

  // Group fields (React 19 Compiler handles memoization)
  const sortedGroups = [...category.attribute_groups].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const fieldsByGroup = groupFieldsByGroup(
    category.attribute_schema,
    category.attribute_groups,
  );

  const isDisabled =
    isSubmitting ||
    isPending ||
    isUploadingImages ||
    createProduct.isPending ||
    updateProduct.isPending ||
    setBrokersApi.isPending;
  // The button only blocks save when broker edits leave the distribution invalid.
  // The org change is fine on its own — backend clears brokers but the user can
  // re-add them if needed.
  const brokersTotal = pendingBrokers.reduce(
    (sum, broker) => sum + (parseFloat(broker.percentage) || 0),
    0,
  );
  const brokersIsValid =
    pendingBrokers.length === 0 ||
    (pendingBrokers.every((broker) => broker.owner_id) &&
      Math.abs(brokersTotal - 100) < 0.01);
  // Block submit if org required but not selected, or brokers invalid
  const orgMissing = isOrgRequired && !selectedOrgId;
  const isSubmitDisabled =
    isDisabled || orgMissing || (brokersDirty && !brokersIsValid);

  // Submit handler
  // ponytail: pass selectedOrgId so images are uploaded to the target org's bucket
  const handleImagesUpload = () => {
    setIsUploadingImages(true);
    // React Compiler can't lower try/finally yet; Promise#finally keeps the
    // same cleanup-always-runs semantics.
    return uploadImages(selectedOrgId ?? undefined).finally(() => {
      setIsUploadingImages(false);
    });
  };

  const buildProductPayload = (
    data: Record<string, unknown>,
    imageKeys: string[],
    coverKey: string | null,
  ) => {
    const { price, description, ...formAttributes } =
      FIXED_FIELDS_SCHEMA_LOOSE.parse(data);

    // ponytail: simple heuristic — vin = vehicle, operation = real estate, else generic
    const categoryType = getCategoryType(category);
    const attributes = { category: categoryType, ...formAttributes };
    if (!isProductAttributes(attributes)) {
      throw new Error("Invalid product attributes");
    }

    const titleTemplate = category.presentation?.title_template;
    // ponytail: in edit mode, keep existing title if template fails
    const title =
      generateTitle(titleTemplate, formAttributes) ||
      existingProduct?.title ||
      category.name;

    return {
      title,
      price_cents: Math.round(price * 100),
      description,
      attributes,
      image_urls: imageKeys,
      ...(coverKey ? { cover_image_key: coverKey } : {}),
      // ponytail: FB account assignments only sent when dirty
      ...(fbAccountsDirty ? { fb_account_ids: selectedFbAccounts } : {}),
    };
  };

  const persistBrokers = async (targetProductId: string) => {
    if (pendingBrokers.length === 0) return;

    const total = pendingBrokers.reduce(
      (sum, b) => sum + (parseFloat(b.percentage) || 0),
      0,
    );
    if (Math.abs(total - 100) >= 0.01) return;

    await setBrokersApi.mutateAsync({
      productId: targetProductId,
      owners: pendingBrokers.map((b) => ({
        owner_id: b.owner_id,
        percentage: parseFloat(b.percentage).toFixed(2),
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

    if (brokersDirty) {
      await persistBrokers(newProduct.id);
    }
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

    // Tenant cascade: if the org changed, send it via PATCH and let the
    // backend clear broker shares (they belong to the previous org).
    // We skip the brokers endpoint this round because the new org starts
    // with no broker splits — the user can add them in a follow-up edit.
    if (orgDirty) {
      await updateProduct.mutateAsync({
        productId,
        data: {
          ...payload,
          organization_id: selectedOrgId ?? undefined,
        },
      });
      setOrgDirty(false);
    } else {
      await updateProduct.mutateAsync({
        productId,
        data: payload,
      });

      if (brokersDirty) {
        await persistBrokers(productId);
        setBrokersDirty(false);
      }
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

  const loadingLabel = mode === "create" ? "Creando..." : "Guardando...";
  const idleLabel = mode === "create" ? "Crear Producto" : "Guardar Cambios";
  const submitButtonContent = isDisabled ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {loadingLabel}
    </>
  ) : (
    idleLabel
  );

  const formContent = (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-8 max-w-4xl"
    >
      {/* Images */}
      <section className="flex flex-col gap-4 scroll-mt-20">
        <h2 className="text-lg font-semibold" data-label="Imágenes">
          Imágenes
        </h2>
        <ImageDropzone />
        <ProductCoverPicker />
      </section>

      {/* Price (fixed field) */}
      <section className="flex flex-col gap-4 scroll-mt-20">
        <h2 className="text-lg font-semibold" data-label="Precio">
          Precio
        </h2>
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
        <section className="flex flex-col gap-4 scroll-mt-20">
          <h2 className="text-lg font-semibold" data-label="Otros">
            Otros
          </h2>
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

      {/* Facebook Marketplace */}
      <section className="flex flex-col gap-4 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ps-text-primary">
          <Facebook className="h-5 w-5 text-ps-cyan" />
          Facebook Marketplace
        </h2>
        <div className="flex items-center gap-3 text-ps-text-primary">
          <span
            className={`h-2.5 w-2.5 rounded-full ${isPublishedToFB ? "bg-ps-cyan" : "bg-ps-border-default"}`}
          />
          <div>
            <span className="font-medium">
              {isPublishedToFB
                ? "Publicado en Facebook Marketplace"
                : "No publicado en Facebook Marketplace"}
            </span>
            <p className="text-sm text-ps-text-secondary">
              {isPublishedToFB
                ? "El bot publica este producto en los grupos de FB configurados. Se activa automáticamente al aprobar el producto."
                : "Se activa automáticamente al aprobar el producto — no requiere ninguna acción acá."}
            </p>
          </div>
        </div>

        {/* FB Account multi-select — independent of publish-to-FB status;
            assignable before approval, per the design's Non-Goals */}
        {fbAccounts.length > 0 && (
          <div className="ml-8 mt-2 space-y-3 rounded-lg border border-ps-border-subtle bg-ps-elevated p-3">
            <p className="text-sm font-medium text-ps-text-primary">
              Cuentas que publicarán este producto:
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-ps-text-primary">
              <input
                type="checkbox"
                checked={selectedFbAccounts.length === 0}
                onChange={() => {
                  // Toggle: if "all" is active, switch to first account; otherwise set to all
                  if (selectedFbAccounts.length === 0) {
                    const firstActive = fbAccounts.find(
                      (a) => a.status === "active",
                    );
                    setFbAccountsOverride(firstActive ? [firstActive.id] : []);
                  } else {
                    setFbAccountsOverride([]);
                  }
                }}
                disabled={isDisabled}
                className="h-4 w-4 cursor-pointer rounded border-ps-border-default accent-ps-cyan"
              />
              <span className="text-sm">
                Usar configuración de la organización
                <span className="ml-1 text-ps-text-tertiary">(heredado)</span>
              </span>
            </label>
            {fbAccounts
              .filter((a) => a.status === "active")
              .map((account) => (
                <label
                  key={account.id}
                  className="flex cursor-pointer items-center gap-2 text-ps-text-primary"
                >
                  <input
                    type="checkbox"
                    checked={selectedFbAccounts.includes(account.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Add this account (removes "all" mode)
                        setFbAccountsOverride([
                          ...selectedFbAccounts.filter(
                            (id) => id !== account.id,
                          ),
                          account.id,
                        ]);
                      } else {
                        const remaining = selectedFbAccounts.filter(
                          (id) => id !== account.id,
                        );
                        // If no accounts left, revert to "all"
                        setFbAccountsOverride(
                          remaining.length > 0 ? remaining : [],
                        );
                      }
                    }}
                    disabled={isDisabled}
                    className="h-4 w-4 cursor-pointer rounded border-ps-border-default accent-ps-cyan"
                  />
                  <span className="text-sm">
                    {account.alias || account.email}
                    <span className="ml-1 text-ps-text-secondary">
                      ({account.groups_count} grupos)
                    </span>
                  </span>
                </label>
              ))}
            <p className="text-xs text-ps-text-tertiary">
              La configuración de la organización aplica a todos sus productos
              por defecto. Seleccioná cuentas específicas solo para excepciones.
            </p>
          </div>
        )}
      </section>

      {/* Tenant cascade — two distinct blocks:
          (1) Organización dueña — visible only for ProSell (admins with
              ORG_ADMIN_VIEW_ALL). Changes here persist via PATCH on the
              product's organization_id; the backend clears broker shares.
          (2) Brokers — visible whenever the selected organization has
              brokers. Changes here persist via PUT /brokers. */}
      {isOrgSelectorVisible && (
        <section
          aria-labelledby="ownership-heading"
          className="flex flex-col gap-4"
        >
          <div>
            <h2 id="ownership-heading" className="text-lg font-semibold">
              {mode === "create" ? "Propiedad" : "Transferir producto"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "create"
                ? "Definí quién va a ser dueño de este producto."
                : "Cambiá la organización propietaria."}
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Organización dueña{" "}
              {isOrgRequired && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={selectedOrgId ?? ""}
              onValueChange={handleOrganizationChange}
              aria-required={isOrgRequired}
              aria-invalid={orgMissing}
            >
              <SelectTrigger
                className={cn("w-full", orgMissing && "border-destructive")}
              >
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
                    Elegí una organización
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                {organizations.map((organization) => {
                  const brokerInfo =
                    (organization.broker_count ?? 0) > 0
                      ? ` (${organization.broker_count} brokers)`
                      : "";
                  return (
                    <SelectItem
                      key={organization.id}
                      value={organization.id}
                      textValue={`${organization.name}${brokerInfo}`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {organization.name}
                        {brokerInfo && (
                          <span className="text-xs text-muted-foreground">
                            {brokerInfo}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {orgMissing && (
              <p className="mt-1.5 text-sm text-destructive" role="alert">
                Tenés que elegir una organización antes de crear el producto.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Transfer confirmation dialog (EDIT mode only) */}
      <AlertDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-ps-warning" />
              Transferir producto
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Vas a transferir este producto de{" "}
                  <strong>{selectedOrg?.name}</strong> a{" "}
                  <strong>{pendingTransferOrg?.name}</strong>.
                </p>
                {pendingBrokers.length > 0 && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                    <p className="font-medium text-destructive">
                      Se van a borrar {pendingBrokers.length} broker
                      {pendingBrokers.length > 1 ? "s" : ""} asignado
                      {pendingBrokers.length > 1 ? "s" : ""}.
                    </p>
                    {/* Only show names if we have broker data loaded */}
                    {brokers.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-sm">
                        {pendingBrokers.map((b) => {
                          const brokerInfo = findBrokerByOwnerId(
                            brokers,
                            b.owner_id,
                          );
                          // Skip if broker not found (stale data)
                          if (!brokerInfo) return null;
                          return (
                            <li key={b.owner_id}>
                              {brokerInfo.name} ({b.percentage}%)
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Después de transferir, podés asignar brokers de la nueva
                  organización.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTransfer}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTransfer}
              className="bg-ps-warning hover:bg-ps-warning/90"
            >
              Sí, transferir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Brokers — visible for both ProSell and the owning org. The brokers
          list comes from useOrganizationBrokers(selectedOrgId). When the
          org is changed by ProSell above, this section resets because the
          new org's brokers are loaded fresh. Visual hierarchy: indented
          with border-l to show brokers belong to the selected organization. */}
      {selectedOrgId && hasBrokers && (
        <section
          aria-labelledby="brokers-heading"
          className="ml-4 flex flex-col gap-4 border-l-4 border-l-primary/20 pl-4"
        >
          <div>
            <h2 id="brokers-heading" className="text-lg font-semibold">
              Distribución de comisiones
            </h2>
            <p className="text-sm text-muted-foreground">
              Asigná porcentajes a los brokers de {selectedOrg?.name}. La suma
              debe ser 100%.
            </p>
          </div>

          {isLoadingBrokers ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando brokers...
            </div>
          ) : pendingBrokers.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updatePendingBrokers([
                  { id: crypto.randomUUID(), owner_id: "", percentage: "100" },
                ])
              }
              disabled={isDisabled}
              className="w-fit"
            >
              <User className="mr-1 h-4 w-4" />
              Distribuir entre brokers
            </Button>
          ) : (
            <>
              <div className="space-y-3">
                {pendingBrokers.map((broker, index) => {
                  const selectedBrokerIds = new Set(
                    pendingBrokers
                      .filter((b) => b.owner_id)
                      .map((b) => b.owner_id),
                  );
                  return (
                    <div key={broker.id} className="flex items-center gap-2">
                      <Select
                        value={broker.owner_id ?? ""}
                        onValueChange={(v) => {
                          // Guard: ignore empty or same value
                          if (!v || v === broker.owner_id) return;
                          const updated = [...pendingBrokers];
                          updated[index] = {
                            ...updated[index],
                            owner_id: v,
                          };
                          updatePendingBrokers(updated);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          {broker.owner_id ? (
                            <span className="flex items-center gap-2 truncate">
                              <User className="h-4 w-4" />
                              {findBrokerByOwnerId(brokers, broker.owner_id)
                                ?.name ?? broker.owner_id}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Seleccionar broker
                            </span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectableBrokers(
                            brokers,
                            selectedBrokerIds,
                            broker.owner_id,
                          ).map((brokerOption) => (
                            <SelectItem
                              key={brokerOption.id}
                              value={brokerOption.user_id ?? brokerOption.id}
                              textValue={brokerOption.name}
                            >
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {brokerOption.name}
                                <span className="text-xs text-muted-foreground">
                                  ({brokerOption.email})
                                </span>
                                {brokerOption.status === "pending" && (
                                  <span className="text-[10px] text-ps-warning">
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
                          value={broker.percentage}
                          onChange={(e) => {
                            const updated = [...pendingBrokers];
                            updated[index] = {
                              ...updated[index],
                              percentage: e.target.value,
                            };
                            updatePendingBrokers(updated);
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
                          updatePendingBrokers(
                            pendingBrokers.filter((_, i) => i !== index),
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

                <p
                  className={cn(
                    "text-sm",
                    Math.abs(brokersTotal - 100) < 0.01
                      ? "text-ps-success"
                      : "text-destructive",
                  )}
                >
                  Total: {brokersTotal.toFixed(2)}%
                  {Math.abs(brokersTotal - 100) >= 0.01 && " (debe ser 100%)"}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const used = pendingBrokers.reduce(
                    (sum, b) => sum + (parseFloat(b.percentage) || 0),
                    0,
                  );
                  const remaining = Math.max(0, 100 - used);
                  updatePendingBrokers([
                    ...pendingBrokers,
                    {
                      id: crypto.randomUUID(),
                      owner_id: "",
                      percentage: String(remaining),
                    },
                  ]);
                }}
                disabled={
                  isDisabled || brokers.length === pendingBrokers.length
                }
                className="w-fit"
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar broker
              </Button>
            </>
          )}
          {brokersDirty && !brokersIsValid && (
            <p className="text-sm text-destructive">
              La distribución de brokers debe sumar 100% y no puede tener
              brokers vacíos.
            </p>
          )}
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
          {submitButtonContent}
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

  // ponytail: optional wizard wrapper - improves mobile UX without touching form logic
  return enableWizard ? (
    <WizardContainer>{formContent}</WizardContainer>
  ) : (
    formContent
  );
}
