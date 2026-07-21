/**
 * TeamForm Component
 *
 * Form for creating/updating teams with validation.
 * Integrates with useTeamStore and React Hook Form + Zod.
 *
 * @example
 * ```tsx
 * <TeamForm mode="create" organizationId={orgId} />
 * <TeamForm mode="edit" teamId={id} />
 * ```
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useTeamStore } from "@/stores";
import { useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export type TeamFormMode = "create" | "edit";

// ============================================
// SCHEMA
// ============================================

const teamSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Team name is required" })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(255, { message: "Name must be less than 255 characters" })
    .trim(),
}) as any;

export type TeamFormValues = z.infer<typeof teamSchema>;

// ============================================
// PROPS
// ============================================

export interface TeamFormProps {
  mode?: TeamFormMode;
  teamId?: string;
  organizationId: string;
  initialData?: Partial<TeamFormValues>;
  onSuccess?: () => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * TeamForm component for creating/editing teams
 *
 * Features:
 * - Name validation with Zod
 * - Loading states during submission
 * - Error display from store state
 * - Navigation after successful creation
 * - Full accessibility support
 */
export function TeamForm({
  mode = "create",
  teamId,
  organizationId,
  initialData,
  onSuccess,
}: TeamFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Get tenant_id from auth store
  const { user } = useAuthStore();
  const tenantId = user?.id || ""; // Use user ID as tenant_id for now

  // Get store methods
  const { createTeam, updateTeam, isLoading, error, clearError } =
    useTeamStore();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    mode: "all",
    defaultValues: {
      name: initialData?.name || "",
    },
  });

  // Derived state
  const isDisabled = isLoading || isSubmitting || isPending;
  const hasFormErrors = Object.keys(errors).length > 0;

  // Clear any residual errors from previous operations
  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear store error when user types
  const handleInputChange = () => {
    if (error) {
      clearError();
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (data: TeamFormValues) => {
    if (isDisabled) {
      return;
    }

    try {
      if (mode === "create") {
        const team = await createTeam({
          name: data.name,
          tenant_id: tenantId,
          organization_id: organizationId,
        });

        // Navigate back to teams list after successful creation
        router.push(`/dashboard/org/${organizationId}/teams`);

        if (onSuccess) {
          onSuccess();
        }
      } else if (mode === "edit" && teamId) {
        await updateTeam(teamId, {
          name: data.name,
        });

        // Navigate back to teams list after successful update
        router.push(`/dashboard/org/${organizationId}/teams`);

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      // Error is handled by store
      toast.error("Failed to submit team form");
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
          Team Name <span className="text-destructive">*</span>
        </Label>
        <Input
          {...register("name")}
          onBlur={handleInputChange}
          id="name"
          type="text"
          placeholder="Sales Team A"
          disabled={isDisabled}
          aria-invalid={!!errors.name || !!error}
          aria-describedby={error ? "team-error" : undefined}
          className={cn(
            (errors.name || error) &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />
        {errors.name && (
          <p role="alert" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Store Error */}
      {error && !hasFormErrors && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <p id="team-error" className="text-sm text-destructive">
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
              ? "Create Team"
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
