'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageDropzone } from '@/components/upload/ImageDropzone'
import { ImageGallery } from '@/components/upload/ImageGallery'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import { useUploadStore } from '@/lib/stores/uploadStore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function CreateVehiclePage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const { uploadImages } = useImageUpload()
  const { uploadedFiles, clearAll } = useUploadStore()

  async function handleSubmit() {
    setIsUploading(true)

    try {
      // Upload all images
      const imageUrls = await uploadImages(
        uploadedFiles.map(f => f.file)
      )

      // Create vehicle with image URLs
      // NOTE: Hardcoded data for MVP - full form coming in Phase 2
      const response = await fetch('/api/v1/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '2021 Toyota Camry',
          price: 25000,
          images: imageUrls,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create vehicle')
      }

      // Clear uploaded files
      clearAll()

      // Show success toast
      toast.success('Vehicle created', {
        description: 'Your vehicle has been successfully added to the catalog.',
      })

      // Redirect to catalog using Next.js router
      router.push('/catalog')
      router.refresh()
    } catch (error) {
      // Show error toast
      toast.error('Failed to create vehicle', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Vehicle</h1>

      {/* Image upload section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Photos</h2>
        <ImageDropzone />
        <ImageGallery />
      </section>

      {/* Vehicle details form */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Vehicle Details</h2>
        {/* NOTE: Simplified form for MVP - full form (title, price, VIN, mileage, condition, description) coming in Phase 2 */}
        <p className="text-sm text-muted-foreground">
          Full vehicle form will be added in Phase 2 (Catalog & Roles)
        </p>
      </section>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={isUploading || uploadedFiles.length === 0}
        size="lg"
        className="w-full"
      >
        {isUploading ? 'Uploading...' : 'Create Vehicle'}
      </Button>
    </div>
  )
}
