'use client'

import { DataGrid, type Vehicle } from "@/components/datagrid/DataGrid";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { FilterPills } from "@/components/filters/FilterPills";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useVehicleFilters } from "@/lib/hooks/useVehicleFilters";
import { useVehicles } from "@/lib/api/vehicles";
import { useDeferredValue, useMemo } from "react";

// Mock data for development (backend endpoints to be implemented in Phase 2)
const mockVehicles: Vehicle[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `vehicle-${i + 1}`,
  title: `${2020 + (i % 5)} Toyota Camry ${["LE", "SE", "XLE", "XSE"][i % 4]}`,
  price: 20000 + (i % 100) * 100,
  status: (["published", "pending", "failed", "draft", "expired", "online", "sold"] as Vehicle["status"][])[i % 7],
  photo_url: i % 3 === 0 ? `https://via.placeholder.com/60` : undefined,
  year: 2020 + (i % 5),
  make: "Toyota",
  model: "Camry",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

export default function CatalogPage() {
  const { filters } = useVehicleFilters();
  const { data: vehicles = mockVehicles, isLoading, error } = useVehicles();

  // Client-side instant search (0ms latency) with useDeferredValue for performance
  const deferredSearch = useDeferredValue(filters.search);
  const filteredVehicles = useMemo(() => {
    if (!deferredSearch) return vehicles;

    const searchLower = deferredSearch.toLowerCase();
    return vehicles?.filter(v =>
      v.title.toLowerCase().includes(searchLower) ||
      v.id.toLowerCase().includes(searchLower) ||
      (v.make && v.make.toLowerCase().includes(searchLower)) ||
      (v.model && v.model.toLowerCase().includes(searchLower))
    ) || [];
  }, [vehicles, deferredSearch]);

  // Server-side deep search is handled by URL param updates in useVehicleFilters
  // The useVehicles hook will refetch when URL params change

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Collapsible filter sidebar */}
      <FilterSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Catálogo</h1>
          <p className="text-sm text-muted-foreground">
            {filteredVehicles.length} vehicles found
          </p>
        </div>

        {/* Active filter pills */}
        <FilterPills />

        {/* DataGrid with filtered data */}
        <div className="flex-1 overflow-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading vehicles...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">Error loading vehicles</p>
            </div>
          ) : (
            <DataGrid data={filteredVehicles} />
          )}
        </div>
      </div>

      {/* Command palette (hidden by default, opened with Cmd+K) */}
      <CommandPalette vehicles={vehicles} />
    </div>
  );
}
