/**
 * Appointments API client
 * Handles appointment scheduling and management
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Appointment status enum - 3-state lifecycle
 */
export enum AppointmentStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/**
 * Appointment entity
 */
export interface Appointment {
  id: string;
  tenant_id: string;
  lead_id: string;
  dealer_id: string;
  vehicle_id: string;
  scheduled_at: string; // ISO datetime string
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for creating a new appointment
 */
export interface CreateAppointmentRequest {
  lead_id: string;
  dealer_id: string;
  vehicle_id: string;
  scheduled_at: string; // ISO datetime string
  notes?: string | null;
}

/**
 * Request payload for updating appointment status
 */
export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

/**
 * Backend appointment response
 */
interface BackendAppointmentResponse {
  id: string;
  tenant_id: string;
  lead_id: string;
  dealer_id: string;
  vehicle_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Backend appointment list response
 */
interface BackendAppointmentListResponse {
  items: BackendAppointmentResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Transform backend appointment response to frontend appointment
 */
function transformAppointment(backendAppointment: BackendAppointmentResponse): Appointment {
  return {
    id: backendAppointment.id,
    tenant_id: backendAppointment.tenant_id,
    lead_id: backendAppointment.lead_id,
    dealer_id: backendAppointment.dealer_id,
    vehicle_id: backendAppointment.vehicle_id,
    scheduled_at: backendAppointment.scheduled_at,
    status: backendAppointment.status,
    notes: backendAppointment.notes,
    created_at: backendAppointment.created_at,
    updated_at: backendAppointment.updated_at,
  };
}

/**
 * Fetch appointments with optional filters
 * @param filters - Optional filters
 * @returns Query result with appointments array
 */
export function useAppointments(
  filters?: { dealer_id?: string; lead_id?: string; status?: AppointmentStatus },
  limit: number = 50,
  offset: number = 0
): UseQueryResult<Appointment[], Error> {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", offset.toString());

  if (filters?.dealer_id) queryParams.append("dealer_id", filters.dealer_id);
  if (filters?.lead_id) queryParams.append("lead_id", filters.lead_id);
  if (filters?.status) queryParams.append("status", filters.status);

  return useQuery({
    queryKey: ["appointments", filters, limit, offset],
    queryFn: async () => {
      const res = await fetch(`/api/v1/appointments?${queryParams.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch appointments" }));
        throw new Error(error.message || "Failed to fetch appointments");
      }

      const data = (await res.json()) as BackendAppointmentListResponse;
      return data.items.map(transformAppointment);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Create appointment mutation
 * @returns Mutation object with createAppointment function
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateAppointmentRequest) => {
      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to create appointment" }));
        throw new Error(error.message || "Failed to create appointment");
      }

      const data = (await res.json()) as BackendAppointmentResponse;
      return transformAppointment(data);
    },
    onSuccess: () => {
      // Invalidate and refetch appointments list
      queryClient.invalidateQueries({ queryKey: ["appointments"] });

      // Invalidate leads list since appointment creation updates lead status
      queryClient.invalidateQueries({ queryKey: ["leads"] });

      // Show success toast
      toast.success("Appointment scheduled successfully");
    },
    onError: (error) => {
      // Show error toast
      toast.error(error.message || "Failed to schedule appointment");
    },
  });
}

/**
 * Update appointment status mutation
 * @param appointmentId - The appointment ID to update
 * @returns Mutation object with updateStatus function
 */
export function useUpdateAppointmentStatus(appointmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateAppointmentStatusRequest) => {
      const res = await fetch(`/api/v1/appointments/${appointmentId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to update appointment status" }));
        throw new Error(error.message || "Failed to update appointment status");
      }

      const data = (await res.json()) as BackendAppointmentResponse;
      return transformAppointment(data);
    },
    onSuccess: () => {
      // Invalidate and refetch appointments list
      queryClient.invalidateQueries({ queryKey: ["appointments"] });

      // Show success toast
      toast.success("Appointment status updated successfully");
    },
    onError: (error) => {
      // Show error toast
      toast.error(error.message || "Failed to update appointment status");
    },
  });
}
