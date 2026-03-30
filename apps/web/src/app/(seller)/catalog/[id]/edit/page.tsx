'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { VehicleForm } from '@/components/forms/VehicleForm'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
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
  const vehicleId = params.id as string

  const [vehicle, setVehicle] = useState<VehicleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch vehicle data
  useEffect(() => {
    async function fetchVehicle() {
      try {
        const response = await fetch(`/api/v1/vehicles/${vehicleId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch vehicle')
        }

        const data = await response.json()
        setVehicle(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        toast.error('Failed to load vehicle', {
          description: message,
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (vehicleId) {
      fetchVehicle()
    }
  }, [vehicleId])

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

  if (error || !vehicle) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Vehicle not found</p>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'Unknown error'}</p>
          <Button
            onClick={() => router.push('/catalog')}
            className="mt-4"
            variant="outline"
          >
            Back to Catalog
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
