# Phase 2: Catalog & Roles - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Session:** Discuss-phase complete (4/4 areas)

---

<domain>

## Phase Boundary

Sistema de catálogo interno multi-tenant con filtrado por roles y asignación dinámica de vendedores a organizaciones (dealers). Cada rol ve exactamente el inventario que le corresponde, con estado de publication en tiempo real por vehículo.

**Multi-tenant:** Todos los queries filtran por `tenant_id`.

**Roles:**
- **Admin ProSell:** Ve todo (todos los inventarios, todos leads, todas métricas)
- **Manager ProSell:** Ve dealers asignados + vendedores bajo su mando
- **Vendedor ProSell:** Ve inventarios de dealers asignados (M:N)
- **Dealer (Organización):** Ve solo su inventario (sin acceso a leads actualmente)

**M:N Relationship:**
- Un vendedor puede tener múltiples organizaciones asignadas
- Una organización puede tener múltiples vendedores
- Tabla intermedia `user_dealers` con histórico

Requirements en scope: CATALOG-01, CATALOG-02, CATALOG-03, CATALOG-04, CATALOG-05, CATALOG-06, CATALOG-07.

</domain>

<decisions>

## Área 1: Filtrado por rol/organización

### Backend Query Forzada
```sql
-- Admin: ve todo
SELECT * FROM vehicles WHERE tenant_id = :current_tenant_id

-- Vendedor ProSell: ve sus dealers asignados
SELECT * FROM vehicles
WHERE tenant_id = :current_tenant_id
  AND dealer_id IN (
    SELECT dealer_id FROM user_dealers
    WHERE user_id = :current_user_id
  )

-- Dealer/Org: ve solo su inventario
SELECT * FROM vehicles
WHERE tenant_id = :current_tenant_id
  AND dealer_id = :user_dealer_id
```

### JWT Structure
```json
{
  "sub": "user-uuid",
  "role": "admin|manager|seller|dealer",
  "tenant_id": "tenant-uuid"
  // NOTA: Sin dealer_id (se lookup en DB para soportar M:N)
}
```

**Razón:** M:N (vendedor ↔ dealers) requiere lookup dinámico, no puede incrustar un solo `dealer_id` en JWT.

### Admin Override
- Si `role = "admin"` → NO aplicar filtro `dealer_id`
- Admin ve todos los vehicles de todos los dealers del tenant

### Error Handling
- 401 Unauthorized si vendedor/dealer no tiene `dealer_id` o `user_dealers` vacío
- Fail fast: no retornar listas vacías, error explícito

---

## Área 2: Dealer (Organization) entity & creación

### Entity Model
**Nueva entity independiente** (no flag en Organization):

```python
class Dealer(Base):  # aka Organization
    id: UUID
    tenant_id: UUID
    name: str
    slug: str  # SEO-friendly, único por tenant
    logo_url: str | None
    contact_phone: str | None
    contact_email: str | None

    # Location
    location_address: str | None
    location_city: str | None
    location_state: str | None
    location_zip: str | None
    location_lat: float | None
    location_lng: float | None

    # Business
    timezone: str = "America/Montevideo"
    settings: dict = {}  # JSONB flexible

    # Audit
    created_at: datetime
    updated_at: datetime
```

### Campos Core (production-ready)
- Todos los campos desde el inicio (no MVP incompleto)
- `settings` JSONB para configuraciones futuras
- Coordenadas para mapas (futuro dashboard)

### UI Creación
- Modal admin (reusa patrón PublishModal de Phase 1)
- Zod validation en frontend
- Server Action para submit

### Slug Generation
- Auto-generate de `name` (JS transformation: lowercase, espacios → guiones)
- Editable por usuario
- Validación backend: único por `tenant_id`
- Ejemplo: "Toyota Centro" → `toyota-centro` (editable)

---

## Área 3: Asignación vendedor-dealer (M:N)

### Relación Confirmada: M:N
```
Vendedor ProSell (Juan Pérez)
    ├── Toyota Centro (asignado)
    ├── Ford Motors (asignado)
    └── Chevrolet Dealer (asignado)
```

**Regla:** Un vendedor puede trabajar para múltiples organizaciones.

### Tabla Intermedia
```python
class UserDealer(Base):
    id: UUID
    user_id: UUID  # FK a User
    dealer_id: UUID  # FK a Dealer (Organization)
    assigned_at: datetime
    assigned_by: UUID  # User que hizo la asignación
    created_at: datetime
```

**Índices:**
- `(user_id, dealer_id)` UNIQUE
- `dealer_id` para queries inversas

### UI para Asignar
**Opción C - Ambos:**

1. **Dropdown en form de Seller/Manager**
   - Multi-select searchable de organizaciones
   - Al crear/editar user, elegir dealers

2. **Bulk action desde DataGrid**
   - Multi-select sellers → "Assign to Organizations"
   - Multi-select dealers → confirmar

### Cambios de Asignación
**Opción A - Libre:**
- Admin puede agregar/quitar organizaciones任何时候
- Multi-select editable en form
- Histórico preservado en `user_dealers` (assigned_at, assigned_by)

---

## Área 4: Backend API endpoints

### Endpoints por Rol

| Rol | Endpoint | Query params | Respuesta |
|-----|----------|--------------|----------|
| **Admin** | `GET /api/vehicles` | `?dealer_id=X&status=Y&search=Z&page=1` | Todos los vehicles |
| **Vendedor ProSell** | `GET /api/vehicles` | `?dealer_id=X,Y,Z&status=Y&search=Z&page=1` | Sus dealers asignados |
| **Vendedor ProSell** | `GET /api/vehicles` (sin dealer_id) | `?status=Y&page=1` | **Ordenados por dealer** |
| **Dealer/Org** | `GET /api/dealers/{id}/vehicles` | `?status=Y&search=Z&page=1` | Solo su inventario |

### Paginación: Cursor-based
```python
# Response
{
  "items": [...],
  "next_cursor": "abc123",  # null si no hay más
  "has_more": true
}

# Request
GET /api/vehicles?limit=50&cursor=abc123
```

**Consistente con Phase 8 Brain #5.**

### Publication State (Array)
```python
{
  "id": "uuid-1",
  "title": "Toyota Corolla 2020",
  "price_cents": 15000000,
  "publications": [
    {
      "id": "pub-uuid-1",
      "status": "published",  # pending|publishing|published|failed|expired|sold
      "platform": "facebook",
      "fb_listing_id": "123456789",
      "published_at": "2026-03-20T10:00:00Z",
      "expires_at": "2026-03-27T10:00:00Z",
      "strategy_used": "playwright"
    }
  ]
}
```

**Razón:** Un vehicle puede tener múltiples publications (expiraciones, republicaciones). Respeta entidad `Publication` de Phase 1.

### Filtros Dinámicos (tipo MercadoLibre/Amazon)

**Basados en `field_config` por categoría:**

```
Vehículos:
  ?make=Toyota&model=Corolla&year_min=2020&year_max=2023
  &price_min=10000&price_max=50000
  &condition=used
  &status=published
  &search=corolla

Inmuebles:
  ?rooms=3&bathrooms=2&m2_min=100

Electrónica:
  ?brand=Sony&model=WH1000XM5
```

**Implementación:**
1. Backend lee `field_config` de la categoría
2. Valida filtros contra config
3. Aplica queries JSONB dinámicas

### Orden por Dealer (ProSell)
**Sin filtro `dealer_id`:**
```json
{
  "items": [
    {"id": 1, "dealer_id": "toyota-uuid", "dealer_name": "Toyota Centro", "title": "Corolla"},
    {"id": 2, "dealer_id": "toyota-uuid", "dealer_name": "Toyota Centro", "title": "Hilux"},
    {"id": 3, "dealer_id": "ford-uuid", "dealer_name": "Ford Motors", "title": "Fiesta"},
    {"id": 4, "dealer_id": "ford-uuid", "dealer_name": "Ford Motors", "title": "Focus"}
  ]
}
```

**ORDER BY:** `dealer_id, THEN created_at DESC`

</decisions>

<specifics>

## Specific Ideas

- "El vendedor ProSell necesita ver inventarios de múltiples dealers — el query con IN subquery es más rápido que múltiples requests"
- "El orden por dealer ayuda al vendedor a contextualizar: 'Toyota Centro tiene 5 vehículos, Ford tiene 3'"
- "Los filtros dinámicos permiten escalar a otras categorías (inmuebles, electrónica) sin cambiar código"
- "La tabla intermedia `user_dealers` preserva histórico — útil para auditoría y análisis"
- "El slug editable permite URLs amigables: /dealers/toyota-centro"

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

**Phase 1 - Publication Entity:**
- `Publication` entity con 6 estados (pending/publishing/published/failed/expired/sold)
- `PublicationStatus`, `PublicationErrorCategory` enums
- State machine methods (mark_publishing, mark_published, mark_failed, etc.)
- IPublicationRepository interface

**Phase 8 - DataGrid & Middleware:**
- TanStack Table + Virtual para 1000+ vehicles
- Route groups (admin), (seller), (dealer), (manager)
- Middleware auth + role + tenant validation
- Cursor-based pagination pattern

**Backend - SQLAlchemy 2.0:**
- `Mapped[]`, `mapped_column()`, `select()` pattern
- Async repositories con interfaces
- Clean Architecture: domain → application → infrastructure

### Gaps to Implement

| Component | Status | Needed |
|-----------|--------|--------|
| **Dealer entity** | ❌ Missing | New entity + model + repository |
| **UserDealer table** | ❌ Missing | M:N relationship + indexes |
| **API endpoints** | ❌ Missing | `/api/vehicles`, `/api/dealers/{id}/vehicles` |
| **Dynamic filters** | ❌ Missing | field_config lookup + JSONB queries |
| **Frontend UI** | ❌ Missing | Multi-select dealers, DataGrid bulk actions |

</code_context>

---

## Next Steps

1. **Plan-phase:** `/gsd:plan-phase 2`
2. **Execution:** Implement Dealer entity, UserDealer M:N, API endpoints
3. **Validation:** Unit tests + integration tests + GGA review

---

**Traceability:**
- Origin: ROADMAP.md Phase 2 definition
- Session: 2026-03-29 discuss-phase (4/4 areas complete)
- Decisions: 16 questions answered
- Ready for planning: YES
