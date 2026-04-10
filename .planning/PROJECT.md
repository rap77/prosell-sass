# ProSell SaaS

## What This Is

ProSell SaaS es una plataforma de servicios de ventas y gestión de clientes para organizaciones, comenzando con el nicho de vehículos. Automatiza la publicación de inventario en Facebook Marketplace vía Graph API, captura leads interesados, y gestiona el ciclo completo hasta agendar citas con los dealers. El equipo de ProSell opera como intermediario entre el comprador (lead) y el concesionario (dealer), usando datos de múltiples marketplaces para generar inteligencia de mercado con IA.

## Core Value

El vendedor de ProSell puede publicar cualquier vehículo en Facebook Marketplace desde la app, capturar el lead interesado, y confirmar la cita con el dealer — todo sin salir del panel interno.

## Current Milestone

**Version**: v1.1
**Name**: Generic Catalog — Categories & Products
**Goal**: Migrate from monolithic vehicles table to generic categories+products+vehicles(FK) architecture, enabling multi-niche catalog management with type-safe vehicle fields, efficient queries, and clean extensibility.

**Target Features**:
- DB migration to C3 schema: `categories(attribute_schema JSONB)`, `products(attributes JSONB)`, `vehicles(product_id FK → products ON DELETE CASCADE)`
- Backend API for categories CRUD (with attribute_schema)
- Backend API for products CRUD (linked to categories, with attributes JSONB)
- Backend API for vehicles CRUD (linked to products via FK, typed fields for VIN/make/model/year/etc.)
- Frontend VehicleForm updated to new products+vehicles schema
- Bulk CSV upload updated to new schema
- DataGrid updated to join products+vehicles
- E2E tests updated and passing for new schema

**Architecture Decision (C3 model)**:
```sql
categories(id, name, slug, attribute_schema JSONB, tenant_id)
products(id, name, price, status, category_id, organization_id, tenant_id, attributes JSONB)
vehicles(id, product_id FK → products ON DELETE CASCADE,
         vin, make, model, year, trim, body_type,
         fuel_type, drivetrain, transmission, engine, mileage_km)
```
*Rationale*: Type safety on vehicle fields, efficient queries without JSON parsing, scalable to new niches without touching existing tables.

---

## Requirements

### Validated

<!-- Ya implementado y funcionando -->

- ✓ User auth con email/password (JWT, refresh tokens, email verification) — Phase 0-1
- ✓ OAuth2 Google login con account linking — Phase 0-1
- ✓ 2FA con TOTP — Phase 0-1
- ✓ Password reset vía email — Phase 0-1
- ✓ Organizaciones (multi-tenant): creación, memberships, roles — Phase 1
- ✓ Teams dentro de organizaciones — Phase 1
- ✓ Gestión de productos/vehículos por organización (inventario básico) — Sprint 5-6
- ✓ Categories con jerarquía — Sprint 5-6
- ✓ Vehicle-specific fields (VIN, year, make, model, mileage, condition) — Sprint 5-6
- ✓ Facebook OAuth integration: conectar páginas de Facebook al tenant — Sprint 7 Phase 2
- ✓ FacebookAccount y FacebookPage entities con token encryption (AES-256) — Sprint 7 Phase 2
- ✓ Token refresh automático (48h antes del expiry) — Sprint 7 Phase 2
- ✓ Task queue infrastructure (Taskiq + Redis) — Sprint 7 Phase 1
- ✓ i18n infrastructure (es/en) — Sprint 7 Phase 1

### Active (Milestone v1.1 — Generic Catalog)

<!-- Migración a arquitectura C3: categories+products+vehicles(FK) -->

- [ ] DB migration to C3 schema (categories with attribute_schema JSONB, products with attributes JSONB, vehicles as FK to products)
- [ ] Existing data preserved during migration (categories, products)
- [ ] Alembic migration runs clean with no conflicts
- [ ] Admin can create/list/update/delete categories with attribute_schema JSONB
- [ ] User can create/list/update/delete products linked to categories
- [ ] Products store category-specific attributes in JSONB field
- [ ] User can create/list vehicle records linked to products (typed fields: VIN, make, model, year, trim, body_type, fuel_type, drivetrain, transmission, engine, mileage_km)
- [ ] VIN decode populates vehicle fields automatically from NHTSA API
- [ ] Deleting a product cascades to delete its vehicle record
- [ ] Frontend VehicleForm uses new products+vehicles schema
- [ ] Bulk CSV upload works with new products+vehicles schema
- [ ] DataGrid displays vehicles from new products+vehicles join query
- [ ] API endpoints: GET/POST /api/v1/categories, GET/POST /api/v1/products, GET/POST /api/v1/vehicles

### Backlog (Post-Milestone v1.1)

<!-- MVP lanzable: cerrar el ciclo completo publicación → lead → cita -->

- [ ] Publicar vehículo en Facebook Marketplace via Graph API desde el panel interno
- [ ] Actualizar y eliminar listings existentes en Facebook Marketplace
- [ ] Scraper Playwright para extraer listings de Facebook Marketplace (mientras se aprueba la app)
- [ ] Scraper Playwright para CarGurus (datos de mercado)
- [ ] Normalización y almacenamiento de listings scrapeados en DB
- [ ] Detección de duplicados entre inventario propio y listings externos
- [ ] Dashboard interno: ver catálogo de vehículos con estado de publicación
- [ ] Panel de Control de Activos: precio sugerido vs precio de mercado por vehículo
- [ ] Captura de leads desde Facebook (webhooks o polling via Graph API)
- [ ] Entidad Appointment: vincular Lead → Vehicle → Dealer con fecha/hora
- [ ] Asignación de lead a vendedor ProSell
- [ ] Notificación simple al dealer cuando se confirma una cita (email/webhook)
- [ ] Métricas básicas: citas generadas por publicación, conversión por dealer

### Out of Scope (v1)

- Catálogo público en prosell.com — requiere SEO, tráfico, competir con FB/CarGurus; primero validar flujo interno
- Ecommerce con pagos — no es el modelo de negocio actual (ProSell cobra al dealer, no al comprador)
- Calendario/scheduling propio — Appointment entity + notificación email es suficiente para v1
- AI price prediction completo — requiere datos limpios primero; v1 solo muestra delta precio propio vs mercado
- Multi-niche (Real Estate, etc.) — mismo stack pero requiere datos de mercado diferentes; post-MVP
- Mobile app — web-first

## Context

**Tracción actual:** 5+ concesionarios en EE.UU. como clientes activos, servicio prestado manualmente hoy.

**Operación actual:** El equipo ProSell entra manualmente a Facebook y publica cada vehículo. Los interesados contactan directo y se agenda la cita por WhatsApp. ProSell es el intermediario entre buyer y dealer.

**Stack implementado:** Python 3.13 + FastAPI + SQLAlchemy 2.0 (async) + Next.js 16 + React 19. Clean Architecture. PostgreSQL + Redis.

**Facebook app:** Configurada en Developers Console. Phase 2 (OAuth) mergeado a main. Graph API publishing y Playwright scraping son el siguiente paso (Sprint 7 Phase 3).

**Multi-niche por diseño:** Entidades genéricas (Organization, Product, Category). Vehicle es un nicho sobre la base. Real Estate y otros siguen el mismo patrón. El schema debe mantenerse niche-agnostic donde sea posible.

**Constraint de scraping:** Facebook bloquea scrapers agresivos. Playwright debe operar con rate limiting y anti-detection patterns. Usar como fallback mientras Graph API permissions se aprueban.

## Constraints

- **Tech Stack**: Python 3.13 + FastAPI + Next.js 16 — establecido, no cambiar
- **Facebook API**: Permisos de `marketplace_catalog_management` pueden tardar en aprobarse — Playwright es el fallback
- **Multi-tenant**: Todo dato lleva `tenant_id` — ninguna entidad nueva puede omitirlo
- **Clean Architecture**: Domain layer sin dependencias externas — no romper la separación de capas
- **Schema multi-niche**: Evitar hardcodear lógica de vehículos en capas que deberían ser genéricas

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Catálogo solo interno en v1 | Validar consistencia de datos antes de exponer al público; foco en cerrar citas | — Pending |
| Appointment entity propia (no Calendly) | Trazabilidad del ROI; datos para IA futura; métricas por dealer | — Pending |
| Playwright como fallback de Graph API | App en revisión por Facebook; no bloquear progreso | — Pending |
| Phase Researcher por fase | APIs externas cambian; validar rate limits y políticas antes de planear | — Pending |
| Mode interactive | Integraciones con APIs externas (FB, CarGurus) requieren validación de tokens/permisos antes de automatizar | — Pending |
| tenant_id en OAuth users | Asignar organization cuando se aprueba OAuth flow; pendiente Sprint 9 (requiere Organizations completo) | ⚠️ Revisit |

---
*Last updated: 2026-04-09 — Milestone v1.1 Generic Catalog started*
