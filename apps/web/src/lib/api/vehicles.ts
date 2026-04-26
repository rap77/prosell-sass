import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type UseQueryResult, type UseInfiniteQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { parse } from "csv-parse/sync";

export interface Vehicle {
  id: string;
  title: string;
  price: number;
  status: "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold";
  photo_url?: string;
  year?: number;
  make?: string;
  model?: string;
  dealer_id?: string;
  dealer_name?: string;
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
  dealer_id?: string;
  dealer_name?: string;
  created_at: string;
  product: {
    id: string;
    title: string;
    price_cents: number;
    status: string;
    category_id: string;
    created_at: string;
  };
}

interface BackendCatalogResponse {
  items: BackendVehicleItem[];
  next_cursor: string | null;
  has_more: boolean;
}

// Transform backend vehicle to frontend vehicle (C3 schema with product join)
export function transformVehicleWithProduct(item: BackendVehicleItem): Vehicle {
  return {
    id: item.id,
    title: item.product.title, // From product, not constructed
    price: item.product.price_cents / 100, // From product
    status: item.product.status as Vehicle["status"], // From product
    photo_url: undefined, // TODO: Add from product_images table
    year: item.year,
    make: item.make,
    model: item.model,
    dealer_id: item.dealer_id,
    dealer_name: item.dealer_name,
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
      const res = await fetch(`/api/v1/vehicles?${queryParams.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch vehicles" }));
        throw new Error(error.message || "Failed to fetch vehicles");
      }

      const data = await res.json() as BackendCatalogResponse;
      return data.items.map(transformVehicleWithProduct);
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

      const res = await fetch(`/api/v1/vehicles?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch vehicles" }));
        throw new Error(error.message || "Failed to fetch vehicles");
      }

      const data = await res.json() as BackendCatalogResponse;
      return {
        items: data.items.map(transformVehicleWithProduct),
        next_cursor: data.next_cursor,
        has_more: data.has_more,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useVehicle(id: string): UseQueryResult<Vehicle, Error> {
  return useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/vehicles/${id}`, {
        credentials: "include",
      });

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
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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

export function useBulkUploadVehicles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("csv_file", file);

      const res = await fetch("/api/v1/vehicles/bulk-upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to bulk upload vehicles" }));
        throw new Error(error.message || "Failed to bulk upload vehicles");
      }

      return res.json() as Promise<{
        total_rows: number;
        created_count: number;
        failed_count: number;
        errors: Array<{ row_number: number; vin: string; error: string }>;
      }>;
    },

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });

      if (result.errors.length === 0) {
        toast.success(`Successfully uploaded ${result.created_count} vehicles`);
      } else {
        toast.error(
          `Uploaded ${result.created_count} vehicles, ${result.failed_count} failed. Check errors below.`,
        );
      }
    },

    onError: (err) => {
      toast.error(err.message || "Failed to bulk upload vehicles");
    },
  });
}

/**
 * Bulk upload products via CSV file
 * Maps CSV rows to products with attributes.vin for auto-vehicle creation
 */
export function useBulkUploadProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Parse CSV file
      const text = await file.text();
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>;

      // Map CSV records to products array
      const products = records.map((row) => ({
        title: row.title || `${row.year} ${row.make} ${row.model}`.trim(),
        price_cents: Math.round(Number(row.price) * 100),
        category_id: row.category_id || "default-category-id", // TODO: Make configurable
        attributes: {
          vin: row.vin, // REQUIRED - triggers vehicle auto-creation
          year: Number(row.year),
          make: row.make,
          model: row.model,
          trim: row.trim,
          body_type: row.body_type || row.body_style,
          mileage: Number(row.mileage),
          exterior_color: row.exterior_color,
          interior_color: row.interior_color,
          transmission: row.transmission,
          fuel_type: row.fuel_type,
          drivetrain: row.drivetrain,
          engine: row.engine,
          cylinders: row.cylinders ? Number(row.cylinders) : undefined,
          description: row.description,
        },
      }));

      // Send to products bulk endpoint
      const res = await fetch("/api/v1/products/bulk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to upload products" }));
        throw new Error(error.message || "Failed to upload products");
      }

      return res.json() as Promise<{
        total_rows: number;
        created_count: number;
        failed_count: number;
        errors: Array<{ row_number: number; vin: string; error: string }>;
      }>;
    },

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      if (result.errors.length === 0) {
        toast.success(`Successfully uploaded ${result.created_count} vehicles`);
      } else {
        toast.error(
          `Uploaded ${result.created_count} vehicles, ${result.failed_count} failed. Check errors below.`,
        );
      }
    },

    onError: (err) => {
      toast.error(err.message || "Failed to upload vehicles");
    },
  });
}

export interface DecodedVehicle {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  body_type?: string;
  drivetrain?: string;
  transmission?: string;
  fuel_type?: string;
  engine?: string;
}

export function useDecodeVin() {
  return useMutation({
    mutationFn: async (vin: string) => {
      const res = await fetch(`/api/v1/vehicles/decode-vin?vin=${vin}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to decode VIN" }));
        throw new Error(error.message || "Failed to decode VIN");
      }

      const data = await res.json() as { vehicle: DecodedVehicle };
      return data.vehicle;
    },

    onSuccess: (decodedVehicle) => {
      toast.success("VIN decoded successfully");
      return decodedVehicle;
    },

    onError: (err) => {
      toast.error(err.message || "Failed to decode VIN");
    },
  });
}
