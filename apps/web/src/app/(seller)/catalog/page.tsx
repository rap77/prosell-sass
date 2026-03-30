'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, type Vehicle } from "@/components/datagrid/DataGrid";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { FilterPills } from "@/components/filters/FilterPills";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useVehicleFilters } from "@/lib/hooks/useVehicleFilters";
import { useInfiniteVehicles, useDeleteVehicle, type Vehicle as ApiVehicle } from "@/lib/api/vehicles";

export default function CatalogPage() {
  const router = useRouter();
  const { filters } = useVehicleFilters();
  const deleteVehicle = useDeleteVehicle();

  // Transform filters to match API format
  const apiFilters = useMemo(() => ({
    search: filters.search || undefined,
    status: filters.status[0] as ApiVehicle["status"] | undefined, // Take first status for now
  }), [filters]);

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteVehicles(apiFilters, 50);

  // Flatten infinite query pages into single array
  const vehicles = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const handlePublish = useCallback((vehicleId: string) => {
    // TODO: Implement publish functionality
  }, []);

  const handleEdit = useCallback((vehicleId: string) => {
    router.push(`/catalog/${vehicleId}/edit`);
  }, [router]);

  const handleDelete = useCallback((vehicleId: string) => {
    deleteVehicle.mutate(vehicleId);
  }, [deleteVehicle]);

  // Setup infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Collapsible filter sidebar */}
      <FilterSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Catálogo</h1>
          <p className="text-sm text-muted-foreground">
            {vehicles.length} vehicles found
          </p>
        </div>

        {/* Active filter pills */}
        <FilterPills />

        {/* DataGrid with filtered data */}
        <div className="flex-1 overflow-auto px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading vehicles...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-destructive font-medium">Error loading vehicles</p>
                <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
              </div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="rounded-full bg-muted p-4">
                <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">No vehicles found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filters.search || filters.status.length > 0 ? "Try adjusting your filters" : "Create your first vehicle to get started"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <DataGrid
                data={vehicles}
                onPublish={handlePublish}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />

              {/* Infinite scroll sentinel */}
              {hasNextPage && (
                <div
                  ref={observerTarget}
                  className="flex items-center justify-center py-4"
                >
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground">Loading more vehicles...</p>
                    </div>
                  )}
                </div>
              )}

              {/* End of list indicator */}
              {!hasNextPage && vehicles.length > 0 && (
                <div className="flex items-center justify-center py-4">
                  <p className="text-sm text-muted-foreground">
                    End of results • {vehicles.length} vehicles
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Command palette (hidden by default, opened with Cmd+K) */}
      <CommandPalette vehicles={vehicles} />
    </div>
  );
}
