import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Vehicle {
  id: string;
  title: string;
  price: number;
  status: "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold";
  photo_url?: string;
  year?: number;
  make?: string;
  model?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleFilters {
  status?: Vehicle["status"];
  search?: string;
}

export function useVehicles(filters?: VehicleFilters): UseQueryResult<Vehicle[], Error> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.search) queryParams.append("search", filters.search);

  return useQuery({
    queryKey: ["vehicles", filters],
    queryFn: async () => {
      const res = await fetch(`/api/v1/vehicles?${queryParams.toString()}`);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch vehicles" }));
        throw new Error(error.message || "Failed to fetch vehicles");
      }

      return res.json() as Promise<Vehicle[]>;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useVehicle(id: string): UseQueryResult<Vehicle, Error> {
  return useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/vehicles/${id}`);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch vehicle" }));
        throw new Error(error.message || "Failed to fetch vehicle");
      }

      return res.json() as Promise<Vehicle>;
    },
    enabled: !!id,
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Vehicle> & { id: string }) => {
      const res = await fetch(`/api/v1/vehicles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to update vehicle" }));
        throw new Error(error.message || "Failed to update vehicle");
      }

      return res.json() as Promise<Vehicle>;
    },

    onMutate: async (newVehicle) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["vehicles"] });
      await queryClient.cancelQueries({ queryKey: ["vehicle", newVehicle.id] });

      // Snapshot previous value
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(["vehicles"]);
      const previousVehicle = queryClient.getQueryData<Vehicle>(["vehicle", newVehicle.id]);

      // Optimistically update to the new value
      queryClient.setQueryData<Vehicle[]>(["vehicles"], (old) =>
        old?.map((v) => (v.id === newVehicle.id ? { ...v, ...newVehicle } : v))
      );

      queryClient.setQueryData<Vehicle>(["vehicle", newVehicle.id], (old) =>
        old ? { ...old, ...newVehicle } : undefined
      );

      // Return context with previous values
      return { previousVehicles, previousVehicle };
    },

    onError: (err, newVehicle, context) => {
      // Rollback to previous value
      if (context?.previousVehicles) {
        queryClient.setQueryData(["vehicles"], context.previousVehicles);
      }
      if (context?.previousVehicle) {
        queryClient.setQueryData(["vehicle", newVehicle.id], context.previousVehicle);
      }

      toast.error(err.message || "Failed to update vehicle");
    },

    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle"] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/vehicles/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to delete vehicle" }));
        throw new Error(error.message || "Failed to delete vehicle");
      }

      return id;
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["vehicles"] });

      const previousVehicles = queryClient.getQueryData<Vehicle[]>(["vehicles"]);

      queryClient.setQueryData<Vehicle[]>(["vehicles"], (old) =>
        old?.filter((v) => v.id !== id)
      );

      return { previousVehicles };
    },

    onError: (err, id, context) => {
      if (context?.previousVehicles) {
        queryClient.setQueryData(["vehicles"], context.previousVehicles);
      }

      toast.error(err.message || "Failed to delete vehicle");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Vehicle, "id" | "created_at" | "updated_at">) => {
      const res = await fetch("/api/v1/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to create vehicle" }));
        throw new Error(error.message || "Failed to create vehicle");
      }

      return res.json() as Promise<Vehicle>;
    },

    onSuccess: (newVehicle) => {
      queryClient.setQueryData<Vehicle>(["vehicle", newVehicle.id], newVehicle);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle created successfully");
    },

    onError: (err) => {
      toast.error(err.message || "Failed to create vehicle");
    },
  });
}
