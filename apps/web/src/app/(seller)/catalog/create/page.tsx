'use client'

/**
 * Catalog › Crear vehículo — ProSell vehicle creation form.
 *
 * Flow: upload images → POST /api/v1/products → redirect to /catalog.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ImageDropzone } from '@/components/upload/ImageDropzone'
import { ImageGallery } from '@/components/upload/ImageGallery'
import { ProductForm, type ProductFormValues } from '@/components/forms/ProductForm'
import { useImageUploadOptimized } from '@/lib/hooks/useImageUploadOptimized'
import { useUploadStore } from '@/lib/stores/uploadStore'

export default function CreateVehiclePage() {
  const router = useRouter()
  const { uploadImages }         = useImageUploadOptimized()
  const { uploadedFiles, clearAll } = useUploadStore()
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (data: ProductFormValues, _imageUrls: string[]) => {
    setIsUploading(true)
    try {
      // Upload images first, then create vehicle
      const uploadedUrls = uploadedFiles.length > 0
        ? await uploadImages(uploadedFiles.map((f) => ({ id: f.id, file: f.file })))
        : []

      const response = await fetch('/api/v1/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       `${data.year} ${data.make} ${data.model}`,
          price_cents: Math.round((data.price || 0) * 100),
          category_id: data.category_id,
          attributes: {
            vin:               data.vin,
            category:          'vehicle',
            year:              data.year,
            make:              data.make,
            model:             data.model,
            trim:              data.trim,
            body_type:         data.body_type,
            drivetrain:        data.drivetrain,
            transmission:      data.transmission,
            fuel_type:         data.fuel_type,
            mileage:           data.mileage,
            exterior_color:    data.exterior_color,
            interior_color:    data.interior_color,
            has_sunroof:       data.has_sunroof,
            has_navigation:    data.has_navigation,
            has_backup_camera: data.has_backup_camera,
            description:       data.description,
            image_urls:        uploadedUrls,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al crear el vehículo' }))
        throw new Error(error.message || 'Error al crear el vehículo')
      }

      clearAll()
      toast.success('Vehículo creado', {
        description: 'El vehículo se agregó exitosamente al catálogo.',
      })
      router.push('/catalog')
      router.refresh()
    } catch (error) {
      toast.error('Error al crear el vehículo', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div style={{ maxWidth: 896, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--ps-text-primary)',
        }}>
          Crear vehículo
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
          Agregá un nuevo vehículo al catálogo.
        </p>
      </div>

      {/* Image upload */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{
          margin: '0 0 14px',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ps-text-primary)',
        }}>
          Fotos
        </h2>
        <ImageDropzone />
        <ImageGallery />
      </section>

      {/* Vehicle form */}
      <ProductForm mode="create" onSubmit={handleSubmit} />

      {/* Upload overlay */}
      {isUploading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(6,13,36,0.7)',
          backdropFilter: 'blur(4px)',
        }}>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <div style={{ textAlign: 'center' }}>
            <Loader2
              size={32}
              strokeWidth={2}
              style={{ color: 'var(--ps-cyan)', animation: 'spin 0.8s linear infinite', margin: '0 auto' }}
            />
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
              Subiendo imágenes y creando vehículo…
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
