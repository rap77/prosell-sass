# PRP: Sprint 5-6 - Gestión de Productos

**Feature**: Sistema de Productos Multi-categoría con VIN Decoder
**Fecha**: 2026-03-04
**Confidence Score**: 8/10

---

## 1. CONTEXTUALIZACIÓN

### 1.1 Estado Actual del Proyecto

| Sprint | Estado | Entregables Clave |
|--------|--------|-------------------|
| Sprint 1-2 | ✅ Completado | Autenticación, OAuth, 2FA, RBAC |
| Sprint 3-4 | ✅ Completado | Organizaciones, Teams, Wallet |
| **Sprint 5-6** | ⏳ **Este PRP** | **Productos, Categorías, VIN Decoder** |

### 1.2 Referencias del Proyecto

- **ROADMAP**: `docs/04_ROADMAP_PROSELL_SAAS_V2.md` (líneas 120-156)
- **PRD**: `docs/02_REQUISITOS_PRD_PROSELL_SAAS_V2.md` (roles y permisos líneas 32-65)
- **Modelo de Datos**: `docs/03_MODELO_DATOS_PROSELL_SAAS_V2.md` (tablas categories, products, vehicles líneas 400-659)
- **Arquitectura**: `docs/01_ARQUITECTURA_PROSELL_SAAS_V2.md` (Clean Architecture líneas 92-160)

### 1.3 Stack Tecnológico Confirmado

```yaml
Backend:
  - Python: 3.13+ (free-threading)
  - Framework: FastAPI 0.115+
  - ORM: SQLAlchemy 2.0 async (Mapped[], mapped_column, select())
  - Validación: Pydantic 2.12+
  - DB: PostgreSQL 17
  - Tests: pytest-asyncio

Frontend:
  - Framework: Next.js 16.1+ (Turbopack)
  - UI: React 19.2 + TailwindCSS 4
  - Forms: React Hook Form + Zod
  - State: Zustand 5
  - Tests: Vitest + Testing Library
```

---

## 2. PATRONES EXISTENTES A SEGUIR

### 2.1 Domain Entity Pattern

**Referencia**: `apps/api/src/prosell/domain/entities/organization.py`

```python
# Patrón a seguir para todas las entities:
class Entity(DomainModel):
    id: UUID
    tenant_id: UUID  # Multi-tenant isolation OBLIGATORIO

    # Factory method para creación
    @classmethod
    def create(cls, ...) -> "Entity":
        return cls(...)

    # Business rules como métodos
    def transition_to(self, new_state) -> None:
        # Validaciones y lógica de dominio
        pass
```

**Gotcha**: TODAS las entities deben incluir `tenant_id: UUID` para aislamiento multi-tenant.

### 2.2 Repository Pattern

**Referencia**: `apps/api/src/prosell/infrastructure/repositories/organization_repository_impl.py`

```python
class SqlAlchemyRepository(AbstractRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Entity | None:
        # SIEMPRE filtrar por tenant_id en queries
        stmt = select(Model).where(
            Model.id == id,
            Model.tenant_id == tenant_id,  # OBLIGATORIO
        )
        ...

    def _to_entity(self, model: Model) -> Entity:
        # Conversión ORM → Domain Entity
        return Entity.model_validate(model, from_attributes=True)
```

**Gotcha**: El método `_to_entity` debe usar `model_validate(..., from_attributes=True)` de Pydantic 2.

### 2.3 Use Case Pattern

**Referencia**: `apps/api/src/prosell/application/use_cases/org/create_organization.py`

```python
class UseCase:
    def __init__(self, repo: AbstractRepository) -> None:
        self.repo = repo

    async def execute(self, request: RequestDTO) -> ResponseDTO:
        # 1. Validaciones usando repos
        # 2. Crear/modificar entity
        # 3. Persistir via repo
        # 4. Retornar ResponseDTO
        pass
```

**Gotcha**: Los use cases NO deben tener lógica de HTTP ni FastAPI. Solo lógica de aplicación.

### 2.4 Alembic Migration Pattern

**Referencia**: `apps/api/alembic/versions/2a3b4c5d6e7f_organizations_teams_wallet_schema.py`

```python
def upgrade() -> None:
    # Usar sa.Uuid() para UUID columns
    op.create_table(
        "table_name",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        ...
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"]),
    )
```

**Gotcha**: CRITICAL - usar `sa.Uuid()` NO `sa.String()` para columnas UUID.

---

## 3. ARQUITECTURA DE LA SOLUCIÓN

### 3.1 Domain Layer (Nuevas Entities)

```
prosell/domain/entities/
├── category.py              # Category entity con lógica de jerarquía
├── product.py               # Product entity base con status transitions
├── product_image.py         # ProductImage entity
└── vehicle.py               # Vehicle entity (extensión de product)
```

**Key Patterns**:
- `Category`: soporta jerarquía (parent_id), validación de circular references
- `Product`: status enum (DRAFT → PENDING → PUBLISHED → SOLD/ARCHIVED)
- `Vehicle`: VIN validation (17 chars alphanumeric), VIN decoded data caching

### 3.2 Application Layer (Nuevos Use Cases)

```
prosell/application/use_cases/
├── category/
│   ├── create_category.py
│   ├── get_category.py
│   └── list_categories.py
├── product/
│   ├── create_product.py
│   ├── update_product.py
│   ├── approve_product.py
│   └── list_products.py
└── vehicle/
    ├── decode_vin.py
    └── sync_vin_data.py
```

### 3.3 Infrastructure Layer

```
prosell/infrastructure/
├── repositories/
│   ├── category_repository_impl.py
│   ├── product_repository_impl.py
│   └── vehicle_repository_impl.py
├── models/
│   ├── category_model.py
│   ├── product_model.py
│   └── vehicle_model.py
└── services/
    └── nhtsa_vin_service.py  # External API client
```

### 3.4 API Layer (Nuevos Routers)

```
prosell/infrastructure/api/routers/
├── category_router.py   # POST /categories, GET /categories, etc.
├── product_router.py    # POST /products, GET /products, PATCH /products/{id}
└── vehicle_router.py    # POST /vehicles/decode-vin
```

---

## 4. INTEGRACIONES EXTERNAS

### 4.1 NHTSA VIN Decoder API

**Base URL**: `https://vpic.nhtsa.dot.gov/api/`

**Endpoint**: `GET /vehicles/DecodeVin/{vin}?format=json`

**Ejemplo**:
```bash
curl "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/1HGCM82633A123456?format=json"
```

**Response**:
```json
{
  "Results": [
    {"Variable": "Make", "Value": "Honda"},
    {"Variable": "Model", "Value": "Civic"},
    {"Variable": "Model Year", "Value": "2023"},
    ...
  ]
}
```

**Implementación Pattern**:
```python
# prosell/infrastructure/services/nhtsa_vin_service.py
class NHTSAVinService:
    BASE_URL = "https://vpic.nhtsa.dot.gov/api"

    async def decode_vin(self, vin: str) -> dict[str, str]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.BASE_URL}/vehicles/DecodeVin/{vin}",
                params={"format": "json"}
            )
            resp.raise_for_status()
            data = resp.json()
            # Convert Results array to dict
            return {r["Variable"]: r["Value"] for r in data["Results"]}
```

**Gotcha**: La API es lenta (~2-5 segundos). Cache obligatorio en `vin_decoded_data` JSONB column.

---

## 5. IMPLEMENTACIÓN - TAREAS EN ORDEN

### Fase 1: Foundation (Día 1-2)

**T1. Crear value objects y enums**
- [ ] `domain/value_objects/product_status.py` (enum: DRAFT, PENDING, PUBLISHED, PAUSED, RESERVED, SOLD, REJECTED, ARCHIVED)
- [ ] `domain/value_objects/product_condition.py` (enum: NEW, USED, REFURBISHED, FOR_PARTS)
- [ ] `domain/value_objects/field_type.py` (enum: TEXT, TEXTAREA, NUMBER, DECIMAL, SELECT, etc.)

**T2. Crear base class para category fields**
- [ ] `domain/value_objects/category_field.py` (dataclass con validación rules)

### Fase 2: Domain Entities (Día 3-4)

**T3. Category Entity**
- [ ] `domain/entities/category.py`
  - Fields: id, tenant_id, name, slug, parent_id, icon, sort_order
  - Methods: `add_child()`, `get_ancestors()`, `validate_no_circular_reference()`

**T4. Product Entity**
- [ ] `domain/entities/product.py`
  - Fields: id, tenant_id, organization_id, category_id, title, description, price, status, attributes (JSONB)
  - Methods: `submit_for_approval()`, `approve()`, `reject()`, `publish()`, `mark_sold()`

**T5. ProductImage Entity**
- [ ] `domain/entities/product_image.py`
  - Fields: id, product_id, urls, sort_order, is_primary
  - Methods: `set_primary()` (desmarca otras primarias)

**T6. Vehicle Entity**
- [ ] `domain/entities/vehicle.py`
  - Fields: id, product_id, vin, year, make, model, trim, mileage, etc.
  - Methods: `validate_vin()`, `update_from_nhtsa()`

### Fase 3: Repository Interfaces (Día 5)

**T7. Create repository interfaces in domain**
- [ ] `domain/repositories/category_repository.py` (AbstractCategoryRepository)
- [ ] `domain/repositories/product_repository.py` (AbstractProductRepository)
- [ ] `domain/repositories/vehicle_repository.py` (AbstractVehicleRepository)

### Fase 4: Infrastructure Models (Día 6-7)

**T8. SQLAlchemy Models**
- [ ] `infrastructure/models/category_model.py`
- [ ] `infrastructure/models/product_model.py`
- [ ] `infrastructure/models/product_image_model.py`
- [ ] `infrastructure/models/vehicle_model.py`

**T9. Repository Implementations**
- [ ] `infrastructure/repositories/category_repository_impl.py`
- [ ] `infrastructure/repositories/product_repository_impl.py`
- [ ] `infrastructure/repositories/vehicle_repository_impl.py`

### Fase 5: Database Migration (Día 8)

**T10. Create Alembic migration**
- [ ] `alembic/versions/YYYYMMDD_HHMM-sprint5_6_products_categories_vehicles.py`

**Includes**:
```sql
-- Tables: categories, category_fields, products, product_images, vehicles
-- Enums: product_status, product_condition, fuel_type, transmission_type, etc.
-- Indexes: GIN on attributes, GIN on search_vector, GiST on location
-- Triggers: update_product_search_vector()
```

**Gotcha**: Ejecutar `alembic upgrade head` después de crear la migración.

### Fase 6: External Service (Día 9)

**T11. NHTSA VIN Service**
- [ ] `infrastructure/services/nhtsa_vin_service.py`
- [ ] `application/ports/ivin_decoder_service.py` (interface)

### Fase 7: Application Layer (Día 10-12)

**T12. Category Use Cases**
- [ ] `application/use_cases/category/create_category.py`
- [ ] `application/use_cases/category/list_categories.py`

**T13. Product Use Cases**
- [ ] `application/use_cases/product/create_product.py`
- [ ] `application/use_cases/product/update_product.py`
- [ ] `application/use_cases/product/approve_product.py`
- [ ] `application/use_cases/product/list_products.py` (con filtros y paginación)

**T14. Vehicle Use Cases**
- [ ] `application/use_cases/vehicle/decode_vin.py`
- [ ] `application/use_cases/vehicle/create_vehicle.py`

**T15. DTOs**
- [ ] `application/dto/category/` (CreateCategoryRequest, CategoryResponse)
- [ ] `application/dto/product/` (CreateProductRequest, ProductResponse, ProductListResponse)
- [ ] `application/dto/vehicle/` (VehicleData, DecodeVinResponse)

### Fase 8: API Layer (Día 13-14)

**T16. Routers**
- [ ] `infrastructure/api/routers/category_router.py`
  - GET /api/v1/categories (listado jerárquico)
  - POST /api/v1/categories (solo MASTER)
  - GET /api/v1/categories/{id}/fields

- [ ] `infrastructure/api/routers/product_router.py`
  - POST /api/v1/products (crear producto)
  - GET /api/v1/products (listado con filtros)
  - GET /api/v1/products/{id}
  - PATCH /api/v1/products/{id}
  - POST /api/v1/products/{id}/submit (para aprobación)
  - POST /api/v1/products/{id}/approve (solo MASTER/VERIFIER)
  - POST /api/v1/products/{id}/reject

- [ ] `infrastructure/api/routers/vehicle_router.py`
  - POST /api/v1/vehicles/decode-vin (decode VIN sin crear producto)

**T17. Dependencies**
- [ ] `infrastructure/api/dependencies.py` agregar factories para nuevos repos

### Fase 9: Tests (Día 15-16)

**T18. Unit Tests**
- [ ] `tests/unit/test_entities/test_category.py`
- [ ] `tests/unit/test_entities/test_product.py`
- [ ] `tests/unit/test_entities/test_vehicle.py`

**T19. Integration Tests**
- [ ] `tests/integration/test_category_api.py`
- [ ] `tests/integration/test_product_api.py`
- [ ] `tests/integration/test_vehicle_api.py`

### Fase 10: Frontend - Placeholder (Día 17-18)

**NOTA**: Frontend completo de productos es Sprint 7-8. Solo crear:

**T20. Frontend - Mínimo para testing**
- [ ] `apps/web/src/app/dashboard/products/page.tsx` (listado básico)
- [ ] `apps/web/src/app/dashboard/products/new/page.tsx` (form create)
- [ ] `apps/web/src/components/products/ProductForm.tsx` (form component)
- [ ] `apps/web/src/stores/productStore.ts` (Zustand store básico)

### Fase 11: CSV Import (Día 19)

**T21. CSV Bulk Import**
- [ ] `infrastructure/services/csv_import_service.py`
- [ ] `application/use_cases/product/import_products_csv.py`
- [ ] `POST /api/v1/products/import-csv` endpoint

---

## 6. VALIDATION GATES

### 6.1 Backend - Syntax y Style

```bash
cd apps/api
ruff check .
ruff format .
pyright
```

Expected: 0 errors (warnings de tests preexistentes OK)

### 6.2 Backend - Unit Tests

```bash
cd apps/api
uv run pytest tests/unit/ -v --tb=short
```

Expected: All new entity tests passing

### 6.3 Backend - Integration Tests

```bash
cd apps/api
uv run pytest tests/integration/test_category_api.py -v
uv run pytest tests/integration/test_product_api.py -v
uv run pytest tests/integration/test_vehicle_api.py -v
```

Expected: All tests passing

### 6.4 Backend - Full Test Suite

```bash
cd apps/api
uv run pytest tests/ -q --tb=no
```

Expected: 350+ tests passing (329 actuales + ~25-30 nuevos)

### 6.5 Database Migration

```bash
cd apps/api
alembic upgrade head
```

Expected: Todas las tablas nuevas creadas correctamente

### 6.6 VIN Decoder Manual Test

```bash
# Test directo de la API NHTSA
curl "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/1HGCM82633A123456?format=json" | jq '.Results[] | select(.Variable == "Make" or .Variable == "Model" or .Variable == "Model Year")'
```

Expected: Devuelve Make=Honda, Model=Civic, Model Year=2003

### 6.7 Frontend - Type Check

```bash
cd apps/web
pnpm run typecheck
```

Expected: 0 errors

---

## 7. GOTCHAS Y CONSIDERACIONES

### 7.1 Multi-Tenant Isolation

**CRITICAL**: Todas las queries de productos DEBEN filtrar por `tenant_id` u `organization_id`.

```python
# ❌ MAL - sin filtro de tenant
stmt = select(ProductModel)

# ✅ BIEN - con filtro
stmt = select(ProductModel).where(ProductModel.organization_id == org_id)
```

### 7.2 Category Circular References

Al crear categorías jerárquicas, prevenir circular references:

```python
def validate_no_circular_reference(self, parent_id: UUID | None) -> None:
    if parent_id == self.id:
        raise ValueError("Category cannot be its own parent")
    # Recursively check ancestors
```

### 7.3 Product Status Transitions

No todas las transiciones son válidas:

```
DRAFT → PENDING → PUBLISHED → SOLD → ARCHIVED
       ↓
     REJECTED

DRAFT → ARCHIVED (cancelar)
PUBLISHED → PAUSED → PUBLISHED (temporal)
```

Implementar como state machine en entity.

### 7.4 VIN Validation

VIN debe ser:
- Exactamente 17 caracteres
- Alfanumérico (no I, O, Q)
- Checksum válido (algoritmo específico)

```python
def validate_vin(vin: str) -> bool:
    if len(vin) != 17:
        return False
    # Check checksum algorithm
    ...
```

### 7.5 Image Upload Flow

Sprint 3-4 implementó presigned URL. Reutilizar:

```typescript
// 1. Get presigned URL
POST /api/v1/products/{id}/upload-url
{ "file_type": "image", "content_type": "image/jpeg" }
→ { upload_url, public_url, key }

// 2. PUT directo a DO Spaces
fetch(upload_url, { method: "PUT", body: file })

// 3. PATCH product con image URL
PATCH /api/v1/products/{id}
{ "images": [{ url: public_url, sort_order: 0 }] }
```

### 7.6 Search Vector Trigger

El trigger de PostgreSQL para full-text search:

```sql
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.attributes::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Gotcha**: `attributes::text` convierte el JSONB a texto para búsqueda.

### 7.7 Category Fields Configuration

Los campos dinámicos se configuran en `category_fields`:

```json
{
  "field_name": "year",
  "field_label": "Año",
  "field_type": "NUMBER",
  "is_required": true,
  "validation_rules": {"min": 1900, "max": 2100},
  "is_searchable": true,
  "field_group": "specs"
}
```

El frontend debe leer estos campos para generar el formulario dinámico.

---

## 8. CRITERIOS DE ÉXITO

- [ ] CRUD completo de categorías jerárquicas funcionando
- [ ] CRUD de productos con status workflow funcionando
- [ ] VIN decoder integrado con cache en DB
- [ ] Upload de imágenes (hasta 20) usando DO Spaces presigned URL
- [ ] Aprobación de productos funcional
- [ ] CSV import funcional
- [ ] Todos los tests passing (350+)
- [ ] Pyright 0 errores en código nuevo
- [ ] Frontend mínimo para testing funcionando

---

## 9. DEPENDENCIAS

**External**:
- NHTSA VPIC API (gratis, no requiere API key)
- DigitalOcean Spaces (ya configurado)

**Internal**:
- Organizations (tenant_id) ✅ ya existe
- Users (created_by, approved_by) ✅ ya existe
- DO Spaces presigned URL ✅ ya existe (Sprint 3-4)

---

## 10. RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| NHTSA API down/hard to reach | Media | Alto | Cache agresivo (24h), retry con backoff |
| VIN decode lento (>5s) | Alta | Medio | Async decode, mostrar "Procesando..." en UI |
| Category circular reference | Media | Medio | Validación en entity + DB constraint |
| Product images order race condition | Baja | Bajo | `sort_order` con timestamp en UI |

---

## 11. SCORE DE CONFIANZA: 8/10

**Por qué 8/10**:
- ✅ Patrones existentes muy claros (org, team, wallet)
- ✅ Modelo de datos documentado exhaustivamente
- ✅ Arquitectura Clean Architecture bien establecida
- ✅ Tests pattern consistente
- ⚠️ VIN decoder API latency fuera de control
- ⚠️ Category fields dynamic UI es complejo (Sprint 7-8)

**Para llegar a 10/10**: Se requiere especificar más detalles del frontend de formularios dinámicos, pero eso es Sprint 7-8 (Catálogo Público).
