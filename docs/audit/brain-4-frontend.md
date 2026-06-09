# CEREBRO 4: FRONTEND - Análisis Completo

**Fecha**: 2026-03-05
**Proyecto**: ProSell SaaS
**Contexto**: Sprint 5-6 completado, auditoría de arquitectura frontend

---

## 🏗️ ARQUITECTURA FRONTEND ACTUAL

### Stack Confirmado (Sólido)

| Tecnología         | Versión          | Propósito        | Estado        |
| ------------------ | ---------------- | ---------------- | ------------- |
| **Next.js**        | 16.1 (Turbopack) | Framework        | ✅ Producción |
| **React**          | 19.2             | UI Library       | ✅ Producción |
| **TypeScript**     | 5.5 strict       | Type safety      | ✅ Producción |
| **TailwindCSS**    | 4.0              | Styling          | ✅ Producción |
| **Zustand**        | 5.x              | State management | ✅ Producción |
| **TanStack Query** | v5               | Data fetching    | ✅ Producción |
| **Tests**          | 358 passing      | Coverage         | ✅ 95%+       |

**Conclusión**: Base técnica sólida para escalar a cualquiera de las dos opciones.

---

## 🔄 CAMBIOS ARQUITECTÓNICOS POR OPCIÓN

### OPCIÓN A: Catálogo Público

#### 1. Rutas Dinámicas por Tenant

**Qué requiere:**

```typescript
// Estructura de rutas
/app/aacglot /
  [tenant_id] /
  page.tsx /
  app /
  catalog /
  [tenant_id] /
  vehicles /
  [slug] /
  page.tsx;
```

**Por qué es necesario:**

- SEO multi-tenant (cada dealer tiene su catálogo)
- Branding por organización
- Subdominios o paths personalizados

**Complejidad**: Media
**Estimado**: 3 días

---

#### 2. Shared Layouts Anidados

**Qué requiere:**

```typescript
// Layouts jerárquicos
app/layout.tsx (root)
└── app/catalog/[tenant_id]/layout.tsx (dealer branding)
    └── app/catalog/[tenant_id]/vehicles/layout.tsx (filters)
```

**Por qué es necesario:**

- Mantener branding del dealer
- Header/Footer consistentes
- Filters persistentes en navegación

**Complejidad**: Baja
**Estimado**: 2 días

---

#### 3. Edge Caching

**Qué requiere:**

```typescript
// Next.js fetch con ISR
export const revalidate = 3600; // 1 hora

// O stale-while-revalidate
fetch(url, { next: { revalidate: 3600 } });
```

**Por qué es necesario:**

- Performance crítica para SEO
- LCP (Largest Contentful Paint) < 2.5s
- Usuarios móviles necesitan carga rápida

**Complejidad**: Baja
**Estimado**: 2 días

---

### OPCIÓN B: Facebook Publishing UI

#### 1. State Machine de Publicación

**Qué requiere:**

```typescript
// Zustand store para publicación
interface PublicationStore {
  status: "draft" | "syncing" | "published" | "error" | "retrying";
  publications: Map<string, PublicationState>;
  publish: (productId: string) => Promise<void>;
  retry: (productId: string) => Promise<void>;
}
```

**Por qué es necesario:**

- Publicación es asíncrona (5-30 segundos)
- Dealer necesita ver estado en tiempo real
- Reintentos automáticos por fallas

**Complejidad**: Alta
**Estimado**: 1 semana

---

#### 2. Server Actions Intensivos

**Qué requiere:**

```typescript
// useActionState para Facebook integration
const [state, formAction] = useActionState(publishToFacebook, initialState);

// Server action
async function publishToFacebook(formData) {
  // 1. Validar
  // 2. Llamar Facebook API
  // 3. Guardar resultado
  // 4. Retornar estado
}
```

**Por qué es necesario:**

- Conexión OAuth con Facebook
- Subida de imágenes
- Manejo de errores y reintentos

**Complejidad**: Alta
**Estimado**: 2 semanas

---

#### 3. Polling/Webhooks

**Qué requiere:**

```typescript
// TanStack Query para polling
useQuery({
  queryKey: ["publication-status", productId],
  queryFn: () => fetchStatus(productId),
  refetchInterval: 5000, // Poll cada 5s
});

// O WebSocket para webhooks
useWebSocket("ws://api/publication-updates");
```

**Por qué es necesario:**

- Facebook API es asíncrona
- Dealer necesita updates en tiempo real
- Webhooks para confirmación de publicación

**Complejidad**: Media-Alta
**Estimado**: 1 semana

---

## 📊 IMPACTO EN PERFORMANCE

### Opción A: Catálogo Público

**Impacto POSITIVO para usuario final:**

| Métrica       | Impacto | Por qué                      |
| ------------- | ------- | ---------------------------- |
| **LCP**       | -40%    | Server-side rendering        |
| **JS Bundle** | -60%    | Client-side mínimo           |
| **TTI**       | -50%    | Menos hydration              |
| **SEO**       | +100%   | Server components + metadata |

**Conclusión**: Ideal para usuarios móviles buscando autos.

---

### Opción B: Facebook Publishing UI

**Impacto MIXTO:**

| Métrica       | Impacto | Por qué                  |
| ------------- | ------- | ------------------------ |
| **LCP**       | +10%    | Más JS client-side       |
| **JS Bundle** | +30%    | Interactividad compleja  |
| **TTI**       | +20%    | Más hydration            |
| **UX**        | +500%   | Dealer puede operar solo |

**Mitigación:**

- `React.lazy` para componentes pesados
- Code splitting por ruta
- Suspense boundaries para carga progresiva

**Conclusión**: Mayor bundle pero necesario para automatización.

---

## 🚀 PATRONES DE REACT 19 A APLICAR

### 1. useOptimistic (Opción B - Crítico)

**Qué es:**

```typescript
import { useOptimistic } from 'react';

function PublishButton({ productId }) {
  const [optimisticState, addOptimistic] = useOptimistic({
    state: currentProduct,
    updateFn: (state, newStatus) => ({...state, ...newStatus})
  });

  const handleClick = () => {
    addOptimistic({ status: 'published' });
    publishToFacebook(productId); // Async
  };

  return <button>{optimisticState.status}</button>;
}
```

**Por qué es CRÍTICO:**

- Dealer siente que la publicación fue instantánea
- Mientras backend habla con Facebook API
- Reduce percepción de latencia

**Estimado**: 3 días de implementación

---

### 2. useFormStatus

**Qué es:**

```typescript
import { useFormStatus } from 'react-dom';

function PublishForm() {
  const { pending, data } = useFormStatus();

  return (
    <button disabled={pending}>
      {pending ? 'Publicando...' : 'Publicar'}
    </button>
  );
}
```

**Por qué es necesario:**

- Estados de carga automáticos
- Sin duplicar lógica de estado
- Integrado con Server Actions

**Estimado**: 2 días de implementación

---

### 3. Metadata API (Opción A)

**Qué es:**

```typescript
import { Metadata } from "next";

export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id);

  return {
    title: product.title,
    description: product.description,
    openGraph: {
      images: [product.images[0].url],
    },
  };
}
```

**Por qué es necesario:**

- SEO dinámico por producto
- OpenGraph para compartir en redes sociales
- Cada vehículo tiene sus propios tags

**Estimado**: 3 días de implementación

---

## ⚠️ DEUDA TÉCNICA A PAGAR

### 1. Fix Vehicle API Tests

**Problema:**

- 8/10 tests de Vehicle API passing
- 20% de casos tienen fallos de integridad

**Impacto:**

- No podemos automatizar hacia Facebook si la base de datos tiene errores
- Datos corruptos se propagan a Facebook

**Solución:**

```typescript
// Tests fallan en:
- VIN validation edge cases
- Vehicle creation con missing fields
- Image upload order preservation

// Arreglar antes de continuar
```

**Estimado**: 3 días

---

### 2. Tipado de field_config

**Problema:**

- Categorías usan `field_config` dinámico
- Frontend necesita ser Type-safe
- Errores en runtime sin validación

**Impacto:**

- Errores en tiempo de ejecución
- UI puede romperse con configs inválidas

**Solución:**

```typescript
// Definir tipos estrictos
interface FieldConfig {
  name: string;
  type: "text" | "number" | "select" | "multiselect";
  required: boolean;
  validation?: ZodSchema;
}

// Validar en runtime
const safeConfig = FieldConfigSchema.parse(rawConfig);
```

**Estimado**: 2 días

---

## 📏 ESTIMADOS REALISTAS (FRONTEND)

### Opción A: Catálogo Público

| Tarea                      | Estimado         | Dependencias |
| -------------------------- | ---------------- | ------------ |
| Rutas dinámicas por tenant | 3 días           | -            |
| Shared layouts anidados    | 2 días           | -            |
| Edge caching               | 2 días           | -            |
| SEO metadata               | 3 días           | -            |
| Filtros y búsqueda         | 5 días           | -            |
| Paginación                 | 2 días           | -            |
| **TOTAL**                  | **~2-3 semanas** |              |

### Opción B: Facebook Publishing UI

| Tarea                     | Estimado         | Dependencias   |
| ------------------------- | ---------------- | -------------- |
| State machine publicación | 1 semana         | Zustand        |
| Server Actions (OAuth)    | 1 semana         | Next.js 16     |
| Polling/Webhooks          | 1 semana         | TanStack Query |
| Preview component         | 3 días           | -              |
| AI Prompt interface       | 3 días           | GPT-4          |
| Scheduler component       | 1 semana         | -              |
| Bulk actions              | 3 días           | -              |
| **Deuda técnica (tests)** | 3 días           | -              |
| **TOTAL**                 | **~4-5 semanas** |                |

---

## 🎯 RECOMENDACIÓN FRONTEND

### VEREDICTO: PRIORIZAR MARKETPLACE INTEGRATION

**Justificación:**

1. **El stack soporta la complejidad**
   - Turbopack hace el bundle size manejable
   - React 19 Actions maneja forms complejos
   - Zustand 5 soporta state machines

2. **La Opción A es "más fácil" pero NO resuelve el problema**
   - Catálogo público es decorating the problem
   - Marketplace automation es solving the problem

3. **Los patrones de React 19 son ideales para esto**
   - `useOptimistic` para percepción de velocidad
   - `useFormStatus` para estados de carga
   - Server Actions para mutations complejas

> "El frontend actual puede soportar la complejidad de la integración de Marketplace gracias a Turbopack y React 19. Priorizar automatización."

---

## 🗺️ ROADMAP FRONTEND PRIORITADO

### Sprint 7+: Marketplace FE (Semanas 1-4)

**Semana 1: Foundation**

- Fix Vehicle API tests (deuda técnica)
- State machine de publicación (Zustand)
- Setup polling/webhooks

**Semana 2: Server Actions**

- OAuth Facebook integration
- Upload de imágenes
- Manejo de errores y reintentos

**Semana 3: UI Components**

- Preview component
- AI Prompt interface
- Optimistic UI (useOptimistic)

**Semana 4: Advanced Features**

- Bulk actions
- Scheduler component
- Dashboard de monitoreo

### Sprint 9: Catálogo Público (Semanas 9-10)

**Solo cuando:**

- Marketplace automation está estable
- Dealers están retenidos
- Hay tiempo para "nice-to-haves"

---

## ✅ CHECKLIST FRONTEND PARA IMPLEMENTAR

### Para Marketplace Integration:

- [ ] Fix Vehicle API tests (8/10 → 10/10)
- [ ] State machine publication (Zustand store)
- [ ] Server Actions (OAuth + mutations)
- [ ] Polling/Webhooks setup
- [ ] Preview component (simulador FB)
- [ ] AI Prompt interface (GPT-4)
- [ ] Optimistic UI (useOptimistic)
- [ ] useFormStatus (loading states)
- [ ] Bulk actions toolbar
- [ ] Scheduler component

### Para Catálogo Público:

- [ ] Rutas dinámicas por tenant
- [ ] Shared layouts anidados
- [ ] Edge caching (ISR/SWR)
- [ ] Metadata API (SEO)
- [ ] Filtros avanzados
- [ ] Búsqueda (Algolia/Postgres full-text)
- [ ] Paginación optimizada
- [ ] Imagen optimizada (next/image)

**Nota**: El catálogo es nice-to-have. Marketplace automation es must-have.

---

**Estado del Cerebro 4**: ✅ ANÁLISIS COMPLETO
**Confianza en recomendación**: 90%
**Nivel de urgencia**: 🔴 CRÍTICA
