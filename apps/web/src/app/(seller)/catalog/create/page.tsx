'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ImageDropzone } from '@/components/upload/ImageDropzone'
import { ImageGallery } from '@/components/upload/ImageGallery'
import { VehicleForm, type VehicleFormValues } from '@/components/forms/VehicleForm'
import { useImageUploadOptimized } from '@/lib/hooks/useImageUploadOptimized'
import { useUploadStore } from '@/lib/stores/uploadStore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

/**
 * Create Vehicle Page
 *
 * Full vehicle creation form with image upload support.
 * Images are uploaded first, then vehicle data is submitted.
 */
export default function CreateVehiclePage() {
  const router = useRouter()
  const { uploadImages } = useImageUploadOptimized()
  const { uploadedFiles, clearAll } = useUploadStore()

  const [isUploading, setIsUploading] = useState(false)

  // Custom submit handler that uploads images first
  const handleSubmit = async (data: VehicleFormValues, _imageUrls: string[]) => {
    setIsUploading(true)

    try {
      // Upload all images first
      const uploadedUrls = uploadedFiles.length > 0
        ? await uploadImages(uploadedFiles.map(f => ({ id: f.id, file: f.file })))
        : []

      // Then create vehicle with uploaded image URLs
      const response = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${data.year} ${data.make} ${data.model}`,
          price_cents: Math.round((data.price || 0) * 100),
          category_id: data.category_id,
          attributes: {
            vin: data.vin,
            category: "vehicle",
            year: data.year,
            make: data.make,
            model: data.model,
            trim: data.trim,
            body_type: data.body_type,
            drivetrain: data.drivetrain,
            transmission: data.transmission,
            fuel_type: data.fuel_type,
            mileage: data.mileage,
            exterior_color: data.exterior_color,
            interior_color: data.interior_color,
            has_sunroof: data.has_sunroof,
            has_navigation: data.has_navigation,
            has_backup_camera: data.has_backup_camera,
            description: data.description,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create vehicle' }))
        throw new Error(error.message || 'Failed to create vehicle')
      }

      // Clear uploaded files
      clearAll()

      toast.success('Vehicle created', {
        description: 'Your vehicle has been successfully added to the catalog.',
      })

      // Redirect to catalog
      router.push('/catalog')
      router.refresh()
    } catch (error) {
      toast.error('Failed to create vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Vehicle</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new vehicle to your catalog
        </p>
      </div>

      {/* Image upload section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Photos</h2>
        <ImageDropzone />
        <ImageGallery />
      </section>

      {/* Vehicle form with custom submit handler */}
      <VehicleForm
        mode="create"
        onSubmit={handleSubmit}
      />

      {/* Loading overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Uploading images and creating vehicle...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
