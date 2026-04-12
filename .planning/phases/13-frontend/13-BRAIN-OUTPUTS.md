# Phase 13 — Domain Brain Outputs
> Generated: 2026-04-12T22:00:00Z
> Status: complete

## Brain #2 — UX Research (Nielsen/Norman)

### Two-Step Creation
**Veredict**: El usuario NO debe percibir la separación product → vehicle. Es una preocupación arquitectónica, no de dominio.

**Recomendación**: Two-step submit transparente:
- Frontend hace `POST /products` → `POST /vehicles` secuencialmente
- Usuario solo ve "Guardando..." → "Vehículo creado"
- Si falla step 2, hacer rollback del product (DELETE /products/{id}) o marcar como `orphaned`

**VIN decode timing**: ANTES de categoría — VIN decode debería AUTO-SELECCIONAR la categoría basado en make/model inferido.

### Category Dropdown (50+ items)
**Veredict**: Searchable Select con fuzzy matching, NO jerarquía.

**Por qué**: Vendedores B2B saben lo que están listando (no están explorando). Jerarquía agrega clics innecesarios.

**Extras UX**:
- Mostrar count de vehículos en esa categoría (ej: "SUV (23)")
- Recent categories para el dealership (top 3 usadas recientemente)
- Suggested basado en vehículos recientes del mismo make

### DataGrid Transition (Mock → Real)
**Veredict**: Skeleton loaders + optimistic UI.

**Por qué skeleton**: Muestra el layout futuro (reduce incertidumbre). Spinner solo indica "esperando" sin contexto.

**1000+ vehicles**: Infinite scroll con virtualization + page size 50. Más natural que paginación numérica para "scrollear inventario".

### CSV Upload
**Veredict**: < 5 segundos para 100 filas con feedback de progreso.

**Errores parciales**: Partial success + downloadable error report. No bloquear todo el lote por algunos errores.

---

## Brain #3 — UI Design (Cooper/Windows principles)

### VehicleForm Structure
**Veredict**: Agregar sección "Product Details" ANTES de VIN section:
```
Product Details
├─ Title*: [Auto-generated from VIN: "{year} {make} {model}"]
├─ Price*: [$________]
├─ Category*: [Select from GET /api/v1/categories]
└─ Attributes: [Dynamic fields from category.attribute_schema]

VIN Section (existing)
└─ VIN*: [______] [Decode button]
```

**attribute_schema dinámico**: Render condicional hardcodeado (NO FormBuilder genérico). JSONB arbitrario es muy complejo para form genérico.

### Category Dropdown
**Veredict**: Radix Select + Combobox searchable con prefetch.
- Jerarquía visual en texto: "Cars > SUV > Toyota"
- Skeleton loading state mientras carga

### DataGrid Columns
**Veredict**: Columnas minimalistas:
```
[Select] [Photo] [Vehicle] [Product] [Price] [Status] [Actions]
```
- Vehicle column: `{year} {make} {model} {trim}`
- Product column: `title` (from Product.name)
- Price column: from `Product.price_cents` / 100

**Pagination**: Paginado primero (más simple), infinite scroll después si el cliente lo pide.

### Error Handling
**Si POST /products falla**: Form data persiste (RHF default) + toast error. Retry hace POST /products de nuevo.

**Si POST /vehicles falla**: DELETE /products/{product_id} (rollback) + toast "Product was rolled back".

**Si categoría deleted**: Toast + clear field + refetch categories.

---

## Brain #4 — Frontend (React 19, Performance Nazi)

### VehicleForm Two-Step
**Veredict**: Usar `useMutation` de TanStack Query con sequential calls:

```typescript
const createVehicle = useMutation({
  mutationFn: async (data) => {
    const product = await fetch('/api/v1/products', { ... })  // Step 1
    const vehicle = await fetch('/api/v1/vehicles', {         // Step 2
      body: JSON.stringify({ product_id: product.id, ... })
    })
    return vehicle
  }
})
```

**Rollback strategy**: Compensating transaction (DELETE /products/{id}) si step 2 falla.

**Optimistic updates**: NO recomendado para create (no tenés ID todavía). Para edit/delete sí.

### Category Dropdown
**Veredict**: `useQuery` con 5min staleTime (categorías cambian poco):

```typescript
const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: fetch('/api/v1/categories'),
  staleTime: 5 * 60 * 1000
})
```

**attribute_schema dinámico**: DEFERRED (Phase 13.5). FormBuilder genérico es un proyecto en sí mismo.

### DataGrid Real Data
**Veredict**: `useInfiniteQuery` con cursor pagination:

```typescript
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['vehicles'],
  queryFn: ({ pageParam }) => fetch(`/api/v1/vehicles?cursor=${pageParam}&limit=50`),
  getNextPageParam: (lastPage) => lastPage.next_cursor
})
```

**TypeScript join**: Backend DTO `VehicleWithProduct` con campos join-ed.

### CSV Upload
**Veredict**: Backend processing (ya implementado) con `uploadStore` para progreso.

**Por qué backend**: Validación de negocio, transacciones, performance, seguridad.

**Progress bar**: Reusar `uploadStore` (Zustand) que ya existe.

---

## Brain #5 — Backend (Clean Architecture, Pydantic 2.12)

### Two-Step Creation
**Veredict**: Auto-crear vehicle si `vin` presente en `CreateProductRequest`.

**Por qué**:
- 99% de vehicles tienen VIN desde el inicio
- Frontend pasa el VIN de todos modos
- Si no hay VIN, es un producto genérico (válido)

**Productos huérfanos**: Flag `is_complete` + cron job cada 6h que marque como `ARCHIVED` los productos sin vehicle después de 24h.

### Category Endpoint
**Veredict**:
- Mantener `GET /categories` sin paginación (~200-300 categorías total)
- Agregar `GET /categories/roots` (solo top-level)
- Redis cache 24h TTL (invalidar cuando se actualiza attribute_schema)

**field_config vs attribute_schema**: Frontend necesita ambos (schema vs UI config).

### Vehicles Endpoint Performance
**Veredict**: Agregar índices compuestos:
```sql
CREATE INDEX idx_vehicle_make_model ON vehicles(make, model) WHERE make IS NOT NULL;
CREATE INDEX idx_vehicle_year ON vehicles(year) WHERE year IS NOT NULL;
```

**Full-text search**: GIN index + `to_tsvector` si search es feature.

**Real-time updates**: SSE (no WebSockets) — unidireccional, auto-reconnect.

### CSV Bulk Upload
**Veredict**: `POST /vehicles/bulk` con chunking, max 1000 filas.

**Límite**: 1000 filas por batch. Si el usuario tiene 5000, dividir en 5 requests.

---

## Brain #6 — QA (Reliability Fundamentalist)

### Breaking Changes Confirmados
1. **VehicleForm**: One call → Two calls (24 tests van a fallar)
2. **Category Select**: Hardcoded → API (tests con opciones hardcodeadas fallan)
3. **DataGrid**: Mocks → Real data (timing changes, `data.length` assertions fallan)

### E2E Tests — Actualización Urgente
**Alta prioridad**:
- `vehicle-form-vin.spec.ts` — 24 tests (submit flow cambia)
- `vehicles.spec.ts` — DataGrid tests (mocks → real data)

**Nuevos tests requeridos**:
- Two-step creation flow
- Category select API integration
- DataGrid real data rendering
- CSV upload product+vehicle creation

### Component Tests (Vitest)
**Estrategia**: Unit tests con mocks (80% casos críticos) + MSW integration tests (hunting flakiness).

**Performance tests**:
- Category Select: 50+ options < 100ms render
- DataGrid: 1000 rows < 2s render

### Regression Testing
**Smoke test** (20 tests críticos): Cada commit, 1-2 min.
**Full E2E suite** (210 tests): Antes de PR merge, 10 min.

### Flakiness Threshold
- Smoke test: 0% tolerable
- Full E2E: <1% tolerable
- Component: 0% tolerable

**Policy**: Flaky test → marcar como `test.skip` inmediatamente + crear issue.

---

## Dispatch Meta
| Property | Value |
|----------|-------|
| Total brains dispatched | 5 |
| All returned successfully | yes |
| Brain #7 (Growth/Data) | Pending (next step) |
