"use client";

import { useVehicleFilters } from "@/lib/hooks/useVehicleFilters";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const BRANDS = [
  "Toyota",
  "Honda",
  "Ford",
  "Chevrolet",
  "Nissan",
  "BMW",
  "Mercedes",
  "Audi",
];
const STATUSES = [
  "published",
  "pending",
  "failed",
  "draft",
  "expired",
  "online",
  "sold",
];

export function FilterSidebar() {
  const { filters, setFilter, clearAllFilters } = useVehicleFilters();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`border-r bg-background transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
        aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className={`p-4 ${isCollapsed ? "hidden" : "space-y-6"}`}>
        {/* Brand filter */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Brand</h3>
          <div className="space-y-2">
            {BRANDS.map((brand) => (
              <div key={brand} className="flex items-center space-x-2">
                <Checkbox
                  id={brand}
                  checked={filters.brand.includes(brand)}
                  onCheckedChange={(checked) => {
                    const newBrands = checked
                      ? [...filters.brand, brand]
                      : filters.brand.filter((b) => b !== brand);
                    setFilter("brand", newBrands);
                  }}
                />
                <Label htmlFor={brand} className="text-sm font-normal">
                  {brand}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Price range filter */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Price Range</h3>
          <Slider
            min={0}
            max={100000}
            step={1000}
            value={filters.priceRange}
            onValueChange={(value) => {
              setFilter("minPrice", String(value[0]));
              setFilter("maxPrice", String(value[1]));
            }}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${filters.priceRange[0].toLocaleString()}</span>
            <span>${filters.priceRange[1].toLocaleString()}</span>
          </div>
        </div>

        {/* Status filter */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Status</h3>
          <div className="space-y-2">
            {STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={status}
                  checked={filters.status.includes(status)}
                  onCheckedChange={(checked) => {
                    const newStatuses = checked
                      ? [...filters.status, status]
                      : filters.status.filter((s) => s !== status);
                    setFilter("status", newStatuses);
                  }}
                />
                <Label
                  htmlFor={status}
                  className="text-sm font-normal capitalize"
                >
                  {status}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Year range filter */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Year Range</h3>
          <Slider
            min={2010}
            max={2026}
            step={1}
            value={filters.year}
            onValueChange={(value) => {
              setFilter("minYear", String(value[0]));
              setFilter("maxYear", String(value[1]));
            }}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{filters.year[0]}</span>
            <span>{filters.year[1]}</span>
          </div>
        </div>

        {/* Clear all button */}
        <Button
          variant="outline"
          onClick={clearAllFilters}
          className="w-full"
          size="sm"
        >
          Clear All Filters
        </Button>
      </div>
    </aside>
  );
}
