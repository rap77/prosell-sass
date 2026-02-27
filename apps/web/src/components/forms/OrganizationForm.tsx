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
  description: z.string().max(1000, "Description must be less than 1000 characters").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  phone: z.string().optional(),
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
      description: initialData?.description || "",
      website: initialData?.website || "",
      phone: initialData?.phone || "",
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
      if (mode === "create") {
        const org = await createOrganization({
          name: data.name,
          tenant_id: tenantId,
          description: data.description || undefined,
          website: data.website || undefined,
          phone: data.phone || undefined,
        });

        // Navigate to organization detail or call onSuccess
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/dashboard/org/${org.id}`);
        }
      } else if (mode === "edit" && organizationId) {
        await updateOrganization(organizationId, {
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
          phone: data.phone || undefined,
        });

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
      console.error("Failed to submit organization form", err);
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
      {/* Name Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          Organization Name <span className="text-destructive">*</span>
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
        <Label htmlFor="phone">Phone</Label>
        <Input
          {...register("phone")}
          onBlur={handleInputChange}
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
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
        <Button
          type="submit"
          disabled={isDisabled}
          className="flex-1"
        >
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
