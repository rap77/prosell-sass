# ⚛️ Frontend Implementation Patterns - Sprint 5-6
**Fuente:** MasterMind Framework - Cerebro #4 (Frontend Development)
**Fecha:** 2026-03-04
**NotebookLM ID:** 85e47142-0a65-41d9-9848-49b8b5d2db33

---

## 📋 STACK CONFIRMADO

- **Next.js 16** (Turbopack)
- **React 19**
- **Tailwind CSS 4**
- **Zustand 5**
- **React Hook Form + Zod**
- **TanStack Query** (React Query)
- **shadcn/ui + Magic UI**

---

## 1. ESTRUCTURA DE CARPETAS (App Router)

```
src/
├── app/
│   ├── (auth)/             # Rutas de autenticación
│   ├── (dashboard)/        # Grupo de rutas para el dashboard
│   │   ├── products/
│   │   │   ├── [id]/       # Detalle y Edición (/products/123)
│   │   │   ├── new/        # Formulario de Carga (/products/new)
│   │   │   └── page.tsx    # Listado de Productos
│   │   └── layout.tsx
│   └── api/                # Endpoints si son necesarios (webhooks)
├── components/
│   ├── ui/                 # Shadcn/ui + Magic UI (atómicos)
│   ├── features/           # Componentes por dominio
│   │   ├── inventory/      # ProductForm, ProductCard, InventoryTable
│   │   └── upload/         # MultiPhotoUpload con progreso
│   └── shared/             # Layouts, Navbar, ErrorBoundary
├── hooks/                  # Custom hooks (useInventory, useVIN)
├── lib/                    # Zod schemas, NHTSA API client
├── services/               # Server Actions
├── store/                  # Zustand stores (UI state)
└── types/                  # TypeScript definitions
```

---

## 2. PATRÓN HYBRID FORM (Crítico para velocidad)

### Server Component + Client Component

```tsx
// app/(dashboard)/products/new/page.tsx (SERVER)
export default async function NewProductPage() {
  const categories = await getCategories() // Server fetch
  return <ProductForm categories={categories} /> // Pass to client
}

// components/features/inventory/ProductForm.tsx (CLIENT)
'use client'
export function ProductForm({ categories }) {
  // React Hook Form + VIN decoder + UI interactivity
}
```

### Validación en ambos lados

```typescript
// lib/schemas.ts
import { z } from 'zod'

export const carSchema = z.object({
  vin: z.string().length(17),
  make: z.string(),
  model: z.string(),
  year: z.number().min(1900).max(2025),
  price: z.number().positive(),
})

// services/inventory-actions.ts
'use server'
export async function saveCar(formData: FormData) {
  const data = Object.fromEntries(formData)
  const validated = carSchema.safeParse(data) // Server validation

  if (!validated.success) return { error: validated.error.format() }

  // Save to DB...
  revalidatePath('/dashboard/products') // Invalidate cache
}
```

---

## 3. STATE MANAGEMENT STRATEGY

### Separar Server State vs Client State

| Tipo de Estado | Solución | Uso |
|----------------|----------|-----|
| **Server State** (DB data) | TanStack Query | Listado de productos, categorías |
| **UI State** (ephemeral) | Zustand | Filtros, progreso upload, modales |
| **Local State** (form) | React Hook Form | Campos del formulario |

### NO duplicar estado

```tsx
// ❌ MAL - Server state duplicado en Zustand
const store = create((set) => ({
  products: [], // Esto lo maneja TanStack Query
}))

// ✅ BIEN - Zustand solo para UI state
const store = create((set) => ({
  filters: { status: 'all', category: null },
  uploadProgress: {},
}))
```

---

## 4. FILE UPLOAD (20 fotos simultáneas)

### Presigned URLs Pattern

```tsx
// 1. Client requests presigned URL
const response = await fetch('/api/upload-url', {
  method: 'POST',
  body: JSON.stringify({ filename, contentType }),
})
const { uploadUrl, publicUrl, key } = await response.json()

// 2. Upload directly to DO Spaces
await axios.put(uploadUrl, file, {
  onUploadProgress: (e) => setProgress(e.loaded / e.total),
})

// 3. Notify server (optional)
await fetch('/api/upload-complete', {
  method: 'POST',
  body: JSON.stringify({ key, publicUrl }),
})
```

### Progreso con XMLHttpRequest

```tsx
// Como fetch no soporta upload progress nativamente
const xhr = new XMLHttpRequest()
xhr.upload.addEventListener('progress', (e) => {
  const progress = e.loaded / e.total
  setProgress(index, progress)
})
xhr.open('PUT', uploadUrl)
xhr.send(file)
```

---

## 5. VIN DECODER CON onBLUR

```tsx
// components/features/inventory/ProductForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export function ProductForm() {
  const { setValue, trigger } = useForm({
    resolver: zodResolver(carSchema),
    mode: 'onBlur', // Validación al salir del campo
  })

  const handleVinBlur = async (vin: string) => {
    if (vin.length !== 17) return

    const decoded = await decodeVin(vin) // NHTSA API
    setValue('make', decoded.Make)
    setValue('model', decoded.Model)
    setValue('year', parseInt(decoded.ModelYear))

    // Trigger validation para actualizar errores
    trigger('vin')
  }

  return (
    <Input
      name="vin"
      onBlur={(e) => handleVinBlur(e.target.value)}
    />
  )
}
```

---

## 6. FACEBOOK PREVIEW CON useTransition

```tsx
// components/features/inventory/SocialPreview.tsx
'use client'
import { useTransition } from 'react'

export function SocialPreview({ data }) {
  const [isPending, startTransition] = useTransition()

  // Actualización no-bloqueante de la preview
  const updatePreview = (newData) => {
    startTransition(() => {
      // Cálculo pesado de renderizado
      setPreviewData(newData)
    })
  }

  return (
    <div className={isPending ? "opacity-50" : ""}>
      <h3>{data.brand} {data.model}</h3>
      <p className="text-2xl font-bold">${data.price}</p>
    </div>
  )
}
```

---

## 7. LISTADO DE PRODUCTOS CON TanStack Query

```tsx
// app/(dashboard)/products/page.tsx
'use client'
import { useQuery } from '@tanstack/react-query'

export function ProductsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  if (isLoading) return <Skeleton />
  if (error) return <ErrorState />

  return (
    <div>
      {data.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Invalidación automática después de crear

```tsx
// En el Server Action
import { revalidatePath } from 'next/cache'

export async function saveCar(formData: FormData) {
  // ... save logic

  revalidatePath('/dashboard/products') // TanStack Query auto-refetch
}
```

---

## 8. ERROR BOUNDARY PARA RESILIENCIA

```tsx
// components/shared/ErrorBoundary.tsx
'use client'
import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI />
    }
    return this.props.children
  }
}

// Usar en el listado
<ErrorBoundary>
  <ProductsList />
</ErrorBoundary>
```

---

## 9. ACCESSIBILITY CHECKLIST

| Patrón | Implementación |
|--------|----------------|
| **Foco visible** | `:focus-visible` con anillo prominente |
| **Zonas de toque** | Mínimo 44x44px en móvil |
| **Aria labels** | Botones con solo ícono necesitan `aria-label` |
| **Inputs nativos** | `type="number"` para precio, `type="text"` para VIN |

---

## 10. PERFORMANCE OPTIMIZATIONS

### Imágenes

```tsx
// Foto principal (LCP priority)
<Image
  src={primaryPhoto}
  alt={`${make} ${model}`}
  width={400}
  height={300}
  priority // LCP optimization
/>

// Grid de fotos (lazy loading)
<Image
  src={photo}
  alt="Foto"
  width={200}
  height={150}
  loading="lazy" // Deferred loading
/>
```

### Code splitting (Automático en App Router)

```tsx
// Route-based splitting (automático)
// /products/new carga solo su código, no el de /products/123
```

---

## 11. SECURITY CONSIDERATIONS

```tsx
// ❌ MAL - Tokens en localStorage
localStorage.setItem('token', userToken)

// ✅ BIEN - Cookies HttpOnly (Next.js default)
// Cookies son manejadas automáticamente por el browser
```

---

## 12. EJEMPLO COMPLETO: ProductForm

```tsx
// components/features/inventory/ProductForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { carSchema } from '@/lib/schemas'
import { saveCar } from '@/services/inventory-actions'
import { useTransition } from 'react'

export function ProductForm({ initialData }) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(carSchema),
    mode: 'onBlur', // Validación inline
    defaultValues: initialData,
  })

  const onSubmit = async (data) => {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value)
      })

      const result = await saveCar(formData)

      if (result.error) {
        // Handle server errors
      } else {
        // Success - redirect or show confirmation
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* VIN Input con Decoder */}
      <div>
        <label>VIN</label>
        <Input
          {...register('vin')}
          onBlur={(e) => handleVinDecode(e.target.value)}
        />
        {errors.vin && <span className="text-red-500">{errors.vin.message}</span>}
      </div>

      {/* Price */}
      <div>
        <label>Precio</label>
        <Input type="number" {...register('price')} />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting || isPending}>
        {isSubmitting ? 'Publicando...' : 'Publicar'}
      </Button>
    </form>
  )
}
```

---

## 13. NEXT STEPS

1. ✅ **Cerebro #3 (UI Design)** - Diseño visual (COMPLETADO)
2. ✅ **Cerebro #4 (Frontend)** - Patrones de implementación (COMPLETADO)
3. ⏳ **Magic UI** - Componentes específicos (forms, dashboards)
4. ⏳ **Cerebro #5 (Backend)** - Arquitectura de integración Facebook

---

**Estado:** ✅ COMPLETADO
**Siguiente paso:** Consultar Magic UI para componentes específicos

---

*Generado por MasterMind Framework v1.0 - Cerebro #4 (Frontend Development)*
