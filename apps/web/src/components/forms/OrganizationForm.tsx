/**
 * OrganizationForm Component
 *
 * Form for creating/updating organizations with validation.
 * Integrates with useOrganizationStore and React Hook Form + Zod.
 *
 * @example
 * ```tsx
 * <OrganizationForm mode="create" />
 * <OrganizationForm mode="edit" organizationId={id} />
 * ```
 */

"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useOrganizationStore } from "@/stores";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export type OrganizationFormMode = "create" | "edit";

// ============================================
// SCHEMA
// ============================================

const organizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be less than 255 characters")
    .trim(),
  code: z
    .string()
    .max(5, "Máximo 5 caracteres")
    .transform((v) => v.toUpperCase())
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  phone: z.string().optional(),
  // Contact
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  // Address
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  // Legal
  tax_id: z.string().optional(),
  // Social
  instagram: z.string().optional(),
  facebook: z.string().url("URL inválida").optional().or(z.literal("")),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;

// ============================================
// PROPS
// ============================================

export interface OrganizationFormProps {
  mode?: OrganizationFormMode;
  organizationId?: string;
  initialData?: Partial<OrganizationFormValues>;
  onSuccess?: () => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * OrganizationForm component for creating/editing organizations
 *
 * Features:
 * - Name, description, website, and phone validation with Zod
 * - Loading states during submission
 * - Error display from store state
 * - Navigation after successful creation
 * - Full accessibility support
 */
export function OrganizationForm({
  mode = "create",
  organizationId,
  initialData,
  onSuccess,
}: OrganizationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Get tenant_id from auth store
  const { user } = useAuthStore();
  const tenantId = user?.id || ""; // Use user ID as tenant_id for now

  // Get store methods
  const {
    createOrganization,
    updateOrganization,
    isLoading,
    error,
    clearError,
  } = useOrganizationStore();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    mode: "all",
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      website: initialData?.website || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      whatsapp: initialData?.whatsapp || "",
      street_address: initialData?.street_address || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      postal_code: initialData?.postal_code || "",
      country: initialData?.country || "",
      tax_id: initialData?.tax_id || "",
      instagram: initialData?.instagram || "",
      facebook: initialData?.facebook || "",
    },
  });

  // Derived state
  const isDisabled = isLoading || isSubmitting || isPending;
  const hasFormErrors = Object.keys(errors).length > 0;

  // Clear store error when user types
  const handleInputChange = () => {
    if (error) {
      clearError();
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (data: OrganizationFormValues) => {
    if (isDisabled) {
      return;
    }

    try {
      const payload = {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        website: data.website || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        whatsapp: data.whatsapp || undefined,
        street_address: data.street_address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        postal_code: data.postal_code || undefined,
        country: data.country || undefined,
        tax_id: data.tax_id || undefined,
        instagram: data.instagram || undefined,
        facebook: data.facebook || undefined,
      };

      if (mode === "create") {
        const org = await createOrganization({
          ...payload,
          tenant_id: tenantId,
        });

        // Navigate to organization detail or call onSuccess
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/dashboard/org/${org.id}`);
        }
      } else if (mode === "edit" && organizationId) {
        await updateOrganization(organizationId, payload);

        // Navigate to organization detail or call onSuccess
        if (onSuccess) {
          onSuccess();
        } else {
          // Navigate back to detail page after successful update
          router.push(`/dashboard/org/${organizationId}`);
        }
      }
    } catch (err) {
      // Error is handled by store
      toast.error("Failed to submit organization form");
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
      className="flex flex-col gap-6"
      noValidate
    >
      {/* Name + Code row */}
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            {...register("name")}
            onBlur={handleInputChange}
            id="name"
            type="text"
            placeholder="Acme Corporation"
            disabled={isDisabled}
            aria-invalid={!!errors.name || !!error}
            aria-describedby={error ? "org-error" : undefined}
            className={cn(
              (errors.name || error) &&
                "border-destructive focus-visible:ring-destructive",
            )}
          />
          {errors.name && errors.name.message && (
            <p role="alert" className="text-sm text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Siglas</Label>
          <Input
            {...register("code")}
            onBlur={handleInputChange}
            id="code"
            type="text"
            maxLength={5}
            placeholder="ACME"
            disabled={isDisabled}
            aria-invalid={!!errors.code}
            className={cn(
              "uppercase w-24",
              errors.code && "border-destructive focus-visible:ring-destructive",
            )}
          />
          {errors.code?.message && (
            <p role="alert" className="text-sm text-destructive">
              {errors.code.message}
            </p>
          )}
        </div>
      </div>

      {/* Description Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          {...register("description")}
          onBlur={handleInputChange}
          id="description"
          placeholder="Brief description of your organization..."
          disabled={isDisabled}
          rows={3}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            (errors.description || error) &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />
        {errors.description && errors.description.message && (
          <p role="alert" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Website Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="website">Website</Label>
        <Input
          {...register("website")}
          onBlur={handleInputChange}
          id="website"
          type="url"
          placeholder="https://example.com"
          disabled={isDisabled}
          aria-invalid={!!errors.website || !!error}
          className={cn(
            (errors.website || error) &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />
        {errors.website && errors.website.message && (
          <p role="alert" className="text-sm text-destructive">
            {errors.website.message}
          </p>
        )}
      </div>

      {/* Phone Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          {...register("phone")}
          onBlur={handleInputChange}
          id="phone"
          type="tel"
          placeholder="+54 11 1234-5678"
          disabled={isDisabled}
          aria-invalid={!!errors.phone || !!error}
          className={cn(
            (errors.phone || error) &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />
        {errors.phone && errors.phone.message && (
          <p role="alert" className="text-sm text-destructive">
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* Email Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email de contacto</Label>
        <Input
          {...register("email")}
          onBlur={handleInputChange}
          id="email"
          type="email"
          placeholder="contacto@empresa.com"
          disabled={isDisabled}
          aria-invalid={!!errors.email}
          className={cn(
            errors.email && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {errors.email?.message && (
          <p role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* WhatsApp Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          {...register("whatsapp")}
          onBlur={handleInputChange}
          id="whatsapp"
          type="tel"
          placeholder="+54 9 11 1234-5678"
          disabled={isDisabled}
        />
      </div>

      {/* Address Section */}
      <div className="border-t pt-4 mt-2">
        <h3 className="text-sm font-medium mb-3">Dirección</h3>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="street_address">Calle y número</Label>
            <Input
              {...register("street_address")}
              id="street_address"
              placeholder="Av. Corrientes 1234"
              disabled={isDisabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                {...register("city")}
                id="city"
                placeholder="Buenos Aires"
                disabled={isDisabled}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="state">Provincia/Estado</Label>
              <Input
                {...register("state")}
                id="state"
                placeholder="CABA"
                disabled={isDisabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="postal_code">Código postal</Label>
              <Input
                {...register("postal_code")}
                id="postal_code"
                placeholder="C1043"
                disabled={isDisabled}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">País</Label>
              <Input
                {...register("country")}
                id="country"
                placeholder="Argentina"
                disabled={isDisabled}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Legal Section */}
      <div className="border-t pt-4 mt-2">
        <h3 className="text-sm font-medium mb-3">Información fiscal</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tax_id">CUIT / RUC / NIT</Label>
          <Input
            {...register("tax_id")}
            id="tax_id"
            placeholder="30-12345678-9"
            disabled={isDisabled}
          />
        </div>
      </div>

      {/* Social Media Section */}
      <div className="border-t pt-4 mt-2">
        <h3 className="text-sm font-medium mb-3">Redes sociales</h3>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              {...register("instagram")}
              id="instagram"
              placeholder="@miempresa"
              disabled={isDisabled}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              {...register("facebook")}
              id="facebook"
              type="url"
              placeholder="https://facebook.com/miempresa"
              disabled={isDisabled}
              aria-invalid={!!errors.facebook}
              className={cn(
                errors.facebook &&
                  "border-destructive focus-visible:ring-destructive",
              )}
            />
            {errors.facebook?.message && (
              <p role="alert" className="text-sm text-destructive">
                {errors.facebook.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Store Error */}
      {error && error.message && error.message.trim() && !hasFormErrors && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <p id="org-error" className="text-sm text-destructive">
            {error.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isDisabled} className="flex-1">
          {isLoading || isPending
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create Organization"
              : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isDisabled}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
