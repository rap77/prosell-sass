'use client'

import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { VehicleForm } from '@/components/forms/VehicleForm'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface VehicleData {
  id: string
  vin?: string
  year?: number
  make?: string
  model?: string
  trim?: string
  body_type?: string
  body_style?: string
  drivetrain?: string
  transmission?: string
  engine?: string
  fuel_type?: string
  mpg_city?: number
  mpg_highway?: number
  mpg_combined?: number
  mileage?: number
  mileage_unit?: 'mi' | 'km'
  exterior_color?: string
  interior_color?: string
  has_sunroof?: boolean
  has_navigation?: boolean
  has_leather?: boolean
  has_backup_camera?: boolean
  has_bluetooth?: boolean
  has_remote_start?: boolean
  seat_material?: string
  stock_number?: string
  description?: string
  images?: string[]
}

export default function EditVehiclePage() {
  const router = useRouter()
  const params = useParams()
  const vehicleId = typeof params.id === 'string' ? params.id : ''

  const {
    data: vehicle,
    isLoading,
    error,
  } = useQuery<VehicleData>({
    queryKey: ['vehicle', vehicleId],
    enabled: vehicleId.length > 0,
    queryFn: async () => {
      const response = await fetch(`/api/v1/vehicles/${vehicleId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch vehicle')
      }

      return response.json() as Promise<VehicleData>
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading vehicle...</p>
        </div>
      </div>
    )
  }

  if (!vehicle) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Vehicle not found</p>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/catalog">Back to Catalog</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Vehicle</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update vehicle information and photos
        </p>
      </div>

      <VehicleForm
        mode="edit"
        vehicleId={vehicleId}
        initialData={vehicle}
        imageUrls={vehicle.images || []}
        onSuccess={() => {
          router.push('/catalog')
          router.refresh()
        }}
      />
    </div>
  )
}
