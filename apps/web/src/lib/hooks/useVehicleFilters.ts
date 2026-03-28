'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useMemo } from 'react'

export interface VehicleFilters {
  search: string
  brand: string[]
  priceRange: [number, number]
  status: string[]
  year: [number, number]
}

export function useVehicleFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read from URL
  const filters = useMemo<VehicleFilters>(() => ({
    search: searchParams.get('search') || '',
    brand: searchParams.get('brand')?.split(',').filter(Boolean) || [],
    priceRange: [
      Number(searchParams.get('minPrice')) || 0,
      Number(searchParams.get('maxPrice')) || 100000,
    ] as [number, number],
    status: searchParams.get('status')?.split(',').filter(Boolean) || [],
    year: [
      Number(searchParams.get('minYear')) || 2010,
      Number(searchParams.get('maxYear')) || 2026,
    ] as [number, number],
  }), [searchParams])

  // Update URL
  const setFilter = (key: string, value: string | string[]) => {
    const params = new URLSearchParams(searchParams)

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','))
      } else {
        params.delete(key)
      }
    } else if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const clearAllFilters = () => {
    router.push('/catalog', { scroll: false })
  }

  return {
    filters,
    setFilter,
    clearAllFilters,
  }
}
