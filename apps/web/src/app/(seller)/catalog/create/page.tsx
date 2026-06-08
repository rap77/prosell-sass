'use client'

/**
 * Catalog › Crear vehículo — ProSell vehicle creation form.
 *
 * Thin page: it only renders the header + <ProductForm mode="create" />.
 * The form owns the ENTIRE image flow (dropzone, cover picker, upload,
 * and persistence) via the Zustand upload store — there is no separate
 * uploader mounted here. On success the form redirects to /catalog.
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { ProductForm } from '@/components/forms/ProductForm'

export default function CreateVehiclePage() {
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

      {/* Vehicle form — owns images (dropzone + cover picker) internally */}
      <ProductForm mode="create" />
    </div>
  )
}
