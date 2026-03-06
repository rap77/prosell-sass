Sprint 5-6: Productos — CONTEXT INICIALIZADO

## Rama
`feature/sprint-5-6-productos` — creada desde `main@{now}`

## PRP Creado
- Archivo: `PRPs/sprint-5-6-productos.md`
- Confidence Score: 8/10
- Fases: 11 fases, 21 tareas principales

## Entregables Sprint 5-6

1. **Categorías jerárquicas** con campos dinámicos
2. **CRUD Productos** con galería de imágenes (hasta 20)
3. **Extensión Vehículos** con VIN Decoder
4. **Bulk Import CSV**
5. **Sistema de aprobación** de productos

## Nuevas Entities (Domain Layer)
```
domain/entities/
├── category.py              # Jerarquía parent_id, validación circular refs
├── product.py               # Status workflow (DRAFT→PENDING→PUBLISHED→SOLD)
├── product_image.py         # Imágenes con sort_order, is_primary
└── vehicle.py               # VIN validation, NHTSA decode cache
```

## Nuevos Use Cases (Application Layer)
```
application/use_cases/
├── category/                # CreateCategory, ListCategories
├── product/                 # CreateProduct, UpdateProduct, ApproveProduct
└── vehicle/                 # DecodeVin, CreateVehicle
```

## Integración Externa
- **NHTSA VPIC API**: `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}`
- Cache obligatorio en `vehicles.vin_decoded_data` (JSONB)
- Timeout esperado: 2-5 segundos (async decode)

## Patrones a Seguir

**Entity Pattern**: Referencia `domain/entities/organization.py`
- Factory method `create()`
- Business rules como métodos de instancia
- `tenant_id: UUID` OBLIGATORIO para multi-tenant

**Repository Pattern**: Referencia `infrastructure/repositories/organization_repository_impl.py`
- `_to_entity(model)` con `model_validate(..., from_attributes=True)`
- TODAS las queries con filtro `tenant_id`

**Migration Pattern**: Referencia `alembic/versions/2a3b4c5d6e7f_organizations_teams_wallet_schema.py`
- Usar `sa.Uuid()` NO `sa.String()` para UUID columns
- Enums con `sa.Enum()` de SQLAlchemy
- GIN index para JSONB attributes

## Validación Gates

```bash
# Backend
cd apps/api
ruff check . && ruff format . && pyright
uv run pytest tests/ -q --tb=no  # Expected: 350+ tests

# Migration
alembic upgrade head

# Frontend (básico)
cd apps/web
pnpm run typecheck
```

## Gotchas Críticos

1. **Multi-tenant**: Todas las queries DEBEN filtrar por `organization_id` o `tenant_id`
2. **VIN Validation**: 17 chars, no I/O/Q, checksum válido
3. **Status Transitions**: State machine, no todas las transiciones válidas
4. **Image Upload**: Reutilizar presigned URL de Sprint 3-4
5. **NHTSA API**: Lenta, usar cache agresivo (24h)

## Sprints Completados
- ✅ Sprint 1-2: Autenticación (OAuth, 2FA, RBAC)
- ✅ Sprint 3-4: Organizaciones (Teams, Wallet, Upload)

## Próximos Sprints
- ⏳ Sprint 5-6: Productos (ESTE)
- Sprint 7-8: Catálogo Público
- Sprint 9-10: Ventas (Citas, Comisiones)

## Archivos de Referencia
- ROADMAP: `docs/04_ROADMAP_PROSELL_SAAS_V2.md` (líneas 120-156)
- PRD: `docs/02_REQUISITOS_PRD_PROSELL_SAAS_V2.md`
- Data Model: `docs/03_MODELO_DATOS_PROSELL_SAAS_V2.md` (líneas 400-659)
- Architecture: `docs/01_ARQUITECTURA_PROSELL_SAAS_V2.md`
