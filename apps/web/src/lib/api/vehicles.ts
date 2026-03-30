import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type UseQueryResult, type UseInfiniteQueryResult } from "@tanstack/react-query";
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
  make?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
}

export interface CatalogResponse {
  items: Vehicle[];
  next_cursor: string | null;
  has_more: boolean;
}

interface BackendVehicleItem {
  id: string;
  product_id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
  exterior_color?: string;
  interior_color?: string;
  price_cents?: number;
  created_at: string;
  publications: Array<{
    id: string;
    status: string;
    platform: string;
  }>;
}

interface BackendCatalogResponse {
  items: BackendVehicleItem[];
  next_cursor: string | null;
  has_more: boolean;
}

// Transform backend vehicle to frontend vehicle
function transformVehicle(item: BackendVehicleItem): Vehicle {
  // Get the most recent publication status
  const latestPublication = item.publications[0];
  const status = (latestPublication?.status || "draft") as Vehicle["status"];

  return {
    id: item.id,
    title: `${item.year} ${item.make} ${item.model} ${item.trim || ""}`.trim(),
    price: item.price_cents ? item.price_cents / 100 : 0,
    status,
    photo_url: undefined, // Will be added from product images
    year: item.year,
    make: item.make,
    model: item.model,
    created_at: item.created_at,
    updated_at: item.created_at,
  };
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

      const data = await res.json() as BackendCatalogResponse;
      return data.items.map(transformVehicle);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useInfiniteVehicles(filters?: VehicleFilters, limit: number = 50) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.search) queryParams.append("search", filters.search);
  if (filters?.make) queryParams.append("make", filters.make);
  if (filters?.model) queryParams.append("model", filters.model);
  if (filters?.year_min) queryParams.append("year_min", filters.year_min.toString());
  if (filters?.year_max) queryParams.append("year_max", filters.year_max.toString());
  queryParams.append("limit", limit.toString());

  return useInfiniteQuery({
    queryKey: ["vehicles", "infinite", filters, limit],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const params = new URLSearchParams(queryParams);
      if (pageParam) {
        params.append("cursor", pageParam);
      }

      const res = await fetch(`/api/v1/vehicles?${params.toString()}`);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch vehicles" }));
        throw new Error(error.message || "Failed to fetch vehicles");
      }

      const data = await res.json() as BackendCatalogResponse;
      return {
        items: data.items.map(transformVehicle),
        next_cursor: data.next_cursor,
        has_more: data.has_more,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
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
    mutationFn: async ({ id, ...data }: Omit<Vehicle, "created_at" | "updated_at"> & { id: string }) => {
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
