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
import { useDealers } from "@/lib/api/dealers";
import { useCreateAppointment } from "@/lib/api/appointments";
import { Loader2 } from "lucide-react";

/**
 * Appointment form schema validation
 */
const appointmentFormSchema = z.object({
  dealer_id: z.string().min(1, "Dealer is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string;
  vehicleId?: string | null;
}

/**
 * AppointmentForm modal - Schedule appointment with dealer
 *
 * Features:
 * - Date-time picker (date input + time select)
 * - Dealer selection dropdown
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
  const { data: dealersData, isLoading: dealersLoading } = useDealers();
  const dealers = dealersData?.items || [];
  const { mutateAsync: createAppointment, isPending: isCreating } =
    useCreateAppointment();

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
      dealer_id: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      // Combine date and time into ISO datetime string
      const scheduled_at = new Date(`${data.date}T${data.time}`).toISOString();

      await createAppointment({
        lead_id: leadId,
        dealer_id: data.dealer_id,
        vehicle_id: vehicleId || "", // Required by backend
        scheduled_at,
        notes: data.notes || null,
      });

      onSuccess();
      onClose();
    } catch (error) {
      // Error is handled by the mutation hook
      console.error("Failed to create appointment:", error);
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            Select a dealer and preferred time slot for the appointment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Dealer Selection */}
          <div className="space-y-2">
            <Label htmlFor="dealer_id">
              Dealer <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch("dealer_id")}
              onValueChange={(value) => setValue("dealer_id", value)}
              disabled={dealersLoading}
            >
              <SelectTrigger id="dealer_id">
                <SelectValue placeholder="Select a dealer" />
              </SelectTrigger>
              <SelectContent>
                {dealers.map((dealer) => (
                  <SelectItem key={dealer.id} value={dealer.id}>
                    {dealer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dealer_id && (
              <p className="text-sm text-red-500">{errors.dealer_id.message}</p>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              min={today}
              {...register("date")}
              className={errors.date ? "border-red-500" : ""}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time">
              Time <span className="text-red-500">*</span>
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
            {errors.time && (
              <p className="text-sm text-red-500">{errors.time.message}</p>
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
