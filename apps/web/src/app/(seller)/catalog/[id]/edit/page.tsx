'use client'

import { useRouter, useParams } from 'next/navigation'
import { ProductForm } from '@/components/forms/ProductForm'

export default function EditVehiclePage() {
  const router = useRouter()
  const params = useParams()
  const productId = typeof params.id === 'string' ? params.id : ''

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Vehicle</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update vehicle information and photos
        </p>
      </div>

      <ProductForm
        mode="edit"
        productId={productId}
        onSuccess={() => {
          router.push('/catalog')
          router.refresh()
        }}
      />
    </div>
  )
}
