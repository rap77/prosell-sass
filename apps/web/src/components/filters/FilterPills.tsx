'use client'

import { useVehicleFilters } from '@/lib/hooks/useVehicleFilters'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FilterPills() {
  const { filters, setFilter, clearAllFilters } = useVehicleFilters()

  const activeFilters = [
    ...(filters.brand.map(b => ({ key: 'brand' as const, label: `Brand: ${b}`, value: b }))),
    ...(filters.status.map(s => ({ key: 'status' as const, label: `Status: ${s}`, value: s }))),
    ...(filters.search ? [{ key: 'search' as const, label: `Search: "${filters.search}"`, value: filters.search }] : []),
    ...((filters.priceRange[0] > 0 || filters.priceRange[1] < 100000)
      ? [{ key: 'priceRange' as const, label: `$${filters.priceRange[0].toLocaleString()} - $${filters.priceRange[1].toLocaleString()}`, value: filters.priceRange }]
      : []
    ),
    ...((filters.year[0] > 2010 || filters.year[1] < 2026)
      ? [{ key: 'year' as const, label: `${filters.year[0]} - ${filters.year[1]}`, value: filters.year }]
      : []
    ),
  ]

  if (activeFilters.length === 0) return null

  const removeFilter = (filter: typeof activeFilters[0]) => {
    if (filter.key === 'brand') {
      setFilter('brand', filters.brand.filter(b => b !== filter.value))
    } else if (filter.key === 'status') {
      setFilter('status', filters.status.filter(s => s !== filter.value))
    } else if (filter.key === 'search') {
      setFilter('search', '')
    } else if (filter.key === 'priceRange') {
      setFilter('minPrice', '0')
      setFilter('maxPrice', '100000')
    } else if (filter.key === 'year') {
      setFilter('minYear', '2010')
      setFilter('maxYear', '2026')
    }
  }

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/20 flex-wrap">
      <span className="text-sm text-muted-foreground">
        Active filters ({activeFilters.length}):
      </span>

      <div className="flex flex-wrap gap-2">
        {activeFilters.map(filter => (
          <Button
            key={`${filter.key}-${Array.isArray(filter.value) ? filter.value.join('-') : filter.value}`}
            variant="secondary"
            size="sm"
            onClick={() => removeFilter(filter)}
            className="h-7 px-2 text-xs"
          >
            {filter.label}
            <X className="w-3 h-3 ml-1" />
          </Button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={clearAllFilters}
        className="ml-auto h-7 text-xs"
      >
        Clear all
      </Button>
    </div>
  )
}
