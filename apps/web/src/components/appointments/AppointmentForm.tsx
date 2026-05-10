"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranches } from "@/lib/api/branches";
import { useCreateAppointment } from "@/lib/api/appointments";
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";

/**
 * Helper function to check if a date string is a weekend
 * Returns true for Sunday (0) or Saturday (6)
 */
function isWeekend(dateString: string): boolean {
  // Use local Date constructor (year, month, day) to avoid UTC-to-local shift.
  // new Date("YYYY-MM-DD") parses as UTC midnight; getDay() then returns the
  // previous day's weekday in negative-offset timezones (e.g. UTC-3 at night).
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0 || date.getDay() === 6;
}

/**
 * Appointment form schema validation with time constraints
 * - Business hours: Mon-Fri, 9am-6pm
 * - Weekends are not allowed
 */
const appointmentFormSchema = z
  .object({
    user_id: z.string().min(1, "User is required"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    notes: z.string().optional(),
  })
  .refine((data) => !isWeekend(data.date), {
    message: "Appointments cannot be scheduled on weekends (Saturday/Sunday)",
    path: ["date"],
  });

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormError extends Error {
  status?: number;
}

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string;
  vehicleId?: string | null;
}

/**
 * AppointmentForm modal - Schedule appointment with branch
 *
 * Features:
 * - Date-time picker (date input + time select)
 * - Branch selection dropdown
 * - Notes textarea
 * - Form validation
 * - Loading states
 * - Error handling
 */
export function AppointmentForm({
  open,
  onClose,
  onSuccess,
  leadId,
  vehicleId,
}: AppointmentFormProps) {
  const { data: branchesData, isLoading: branchesLoading } = useBranches();
  const branches = branchesData?.items || [];
  const { mutateAsync: createAppointment, isPending: isCreating } =
    useCreateAppointment();

  // State for error display (A4.33)
  const [submitError, setSubmitError] = useState<{
    type: "conflict" | "validation";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      user_id: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  // Reset form and error when modal opens/closes
  useEffect(() => {
    if (!open) {
      reset();
      setSubmitError(null);
    }
  }, [open, reset]);

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      // Clear previous errors
      setSubmitError(null);

      // Combine date and time into ISO datetime string
      const scheduled_at = new Date(`${data.date}T${data.time}`).toISOString();

      await createAppointment({
        lead_id: leadId,
        user_id: data.user_id,
        product_id: vehicleId || "", // Required by backend
        scheduled_at,
        notes: data.notes || null,
      });

      onSuccess();
      onClose();
    } catch (error: unknown) {
      // A4.33: Display conflict/validation warnings
      const appointmentError = error as AppointmentFormError;

      // Check if error has status code (from backend response)
      const status = appointmentError.status || 500;

      if (status === 409) {
        // Conflict - branch already has appointment
        setSubmitError({
          type: "conflict",
          message: appointmentError.message || "This branch already has an appointment at this time.",
        });
      } else if (status === 400) {
        // Validation error - business hours, weekend, etc.
        setSubmitError({
          type: "validation",
          message: appointmentError.message || "Invalid appointment time.",
        });
      } else {
        // Generic error - fallback to toast
        setSubmitError({
          type: "validation",
          message: "Failed to schedule appointment. Please try again.",
        });
      }
    }
  };

  // Generate time slots (business hours: 9am - 6pm)
  const timeSlots = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ];

  // Set minimum date to today
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            Select a branch and preferred time slot for the appointment.
          </DialogDescription>
        </DialogHeader>

        {/* A4.33: Error banner for conflicts and validation errors */}
        {submitError && (
          <div
            data-testid="appointment-error-banner"
            className={`flex items-start gap-3 p-4 rounded-lg border ${
              submitError.type === "conflict"
                ? "bg-red-50 border-red-200 text-red-900"
                : "bg-yellow-50 border-yellow-200 text-yellow-900"
            }`}
          >
            {submitError.type === "conflict" ? (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium text-sm">
                {submitError.type === "conflict"
                  ? "Scheduling Conflict"
                  : "Validation Error"}
              </p>
              <p className="text-sm mt-1">{submitError.message}</p>
              <p className="text-xs mt-2 opacity-90">
                {submitError.type === "conflict"
                  ? "Please choose a different time or branch."
                  : "Please choose a weekday within business hours (9:00 AM - 6:00 PM)."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-current opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label htmlFor="user_id">
              Branch <span className="text-red-600">*</span>
            </Label>
            <Select
              value={watch("user_id")}
              onValueChange={(value) => setValue("user_id", value)}
              disabled={branchesLoading}
            >
              <SelectTrigger id="user_id">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.user_id && (
              <p className="text-sm text-red-600">{errors.user_id.message}</p>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">
              Date <span className="text-red-600">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              min={today}
              {...register("date")}
              className={errors.date ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Business hours: Monday-Friday only
            </p>
            {errors.date && (
              <p className="text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time">
              Time <span className="text-red-600">*</span>
            </Label>
            <Select
              value={watch("time")}
              onValueChange={(value) => setValue("time", value)}
            >
              <SelectTrigger id="time">
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => {
                  const [hours, minutes] = time.split(":");
                  const displayTime = new Date(
                    2026,
                    0,
                    1,
                    parseInt(hours),
                    parseInt(minutes)
                  ).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });
                  return (
                    <SelectItem key={time} value={time}>
                      {displayTime}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Business hours: 9:00 AM - 6:00 PM
            </p>
            {errors.time && (
              <p className="text-sm text-red-600">{errors.time.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              rows={3}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
