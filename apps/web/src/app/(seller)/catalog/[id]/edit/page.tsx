'use client'

/**
 * Catalog › Editar vehículo — ProSell vehicle edit form.
 *
 * Wraps ProductForm in edit mode with product pre-loading.
 * On success → redirect to /catalog.
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProductForm } from '@/components/forms/ProductForm'

export default function EditVehiclePage() {
  const router   = useRouter()
  const params   = useParams()
  const productId = typeof params.id === 'string' ? params.id : ''

  return (
    <div style={{ maxWidth: 896, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <Link
          href="/catalog"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            padding: '0 12px',
            marginTop: 2,
            background: 'var(--ps-bg-elevated)',
            border: '1px solid var(--ps-border-default)',
            borderRadius: 8,
            color: 'var(--ps-text-secondary)',
            fontSize: 13,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Volver
        </Link>

        <div>
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--ps-text-primary)',
          }}>
            Editar vehículo
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Actualizá la información y las fotos del vehículo.
          </p>
        </div>
      </div>

      {/* Edit form — owns images (dropzone + cover picker) internally.
          The cover is persisted on submit as part of the PATCH, not as
          a separate immediate operation. */}
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
