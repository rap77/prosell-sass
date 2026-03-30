/**
 * MemberForm Component
 *
 * Form for adding vendors/managers to a team with commission rate.
 * Integrates with useTeamStore and React Hook Form + Zod.
 *
 * @example
 * ```tsx
 * <MemberForm teamId={teamId} onSuccess={() => {}} />
 * ```
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTeamStore, TeamMemberRole } from "@/stores";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { Controller } from "react-hook-form";
import { toast } from "sonner";

// ============================================
// SCHEMA
// ============================================

const memberSchema = z.object({
  user_id: z
    .string()
    .min(1, "User ID is required"),
  role: z.enum(["manager", "vendor"] as const, {
    message: "Role is required",
  }),
  commission_rate: z.preprocess(
    (val) => (Number.isNaN(val) ? undefined : val),
    z
      .number()
      .min(0, "Commission must be 0 or greater")
      .max(100, "Commission cannot exceed 100%")
      .optional()
  ),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

// ============================================
// PROPS
// ============================================

export interface MemberFormProps {
  teamId: string;
  onSuccess?: () => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * MemberForm component for adding members to teams
 *
 * Features:
 * - User ID, role, and commission rate validation
 * - Role selector (Manager/Vendor)
 * - Loading states during submission
 * - Error display from store state
 * - Full accessibility support
 */
export function MemberForm({
  teamId,
  onSuccess,
}: MemberFormProps) {
  const [isPending, startTransition] = useTransition();

  // Get tenant_id from auth store
  const { user } = useAuthStore();
  const tenantId = user?.id || ""; // Use user ID as tenant_id for now

  // Get store methods
  const {
    addMember,
    isLoading,
    error,
    clearError,
  } = useTeamStore();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    mode: "all",
    defaultValues: {
      user_id: "",
      role: "vendor" as TeamMemberRole,
      commission_rate: undefined,
    },
  });

  const selectedRole = watch("role");

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
  const onSubmit = async (data: MemberFormValues) => {
    if (isDisabled) {
      return;
    }

    try {
      await addMember(teamId, {
        user_id: data.user_id,
        tenant_id: tenantId,
        role: data.role,
        commission_rate: data.commission_rate ?? null,
      });

      // Reset form and call onSuccess
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error is handled by store
      toast.error("Failed to submit member form");
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
      {/* User ID Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="user_id">
          User ID <span className="text-destructive">*</span>
        </Label>
        <Input
          {...register("user_id")}
          onBlur={handleInputChange}
          id="user_id"
          type="text"
          placeholder="Enter user ID"
          disabled={isDisabled}
          aria-invalid={!!errors.user_id || !!error}
          aria-describedby={error ? "member-error" : undefined}
          className={cn(
            (errors.user_id || error) &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />
        {errors.user_id && (
          <p role="alert" className="text-sm text-destructive">
            {errors.user_id.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Note: In production, this will be a user selector dropdown
        </p>
      </div>

      {/* Role Selector */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="role">
          Role <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <select
              {...field}
              id="role"
              onChange={(e) => {
                field.onChange(e.target.value as TeamMemberRole);
                handleInputChange();
              }}
              disabled={isDisabled}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                (errors.role || error) &&
                  "border-destructive focus-visible:ring-destructive",
              )}
            >
              <option value="vendor">Vendor</option>
              <option value="manager">Manager</option>
            </select>
          )}
        />
        {errors.role && (
          <p role="alert" className="text-sm text-destructive">
            {errors.role.message}
          </p>
        )}
      </div>

      {/* Commission Rate Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="commission_rate">
          Commission Rate (%)
        </Label>
        <Input
          {...register("commission_rate", { valueAsNumber: true })}
          onBlur={handleInputChange}
          id="commission_rate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="e.g. 5.5"
          disabled={isDisabled}
          aria-invalid={!!errors.commission_rate || !!error}
          className={cn(
            (errors.commission_rate || error) &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />
        {errors.commission_rate && (
          <p role="alert" className="text-sm text-destructive">
            {errors.commission_rate.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Optional: Percentage commission for this member (0-100%)
        </p>
      </div>

      {/* Store Error */}
      {error && !hasFormErrors && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <p id="member-error" className="text-sm text-destructive">
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
          {isLoading || isPending ? "Adding..." : "Add Member"}
        </Button>
      </div>
    </form>
  );
}
