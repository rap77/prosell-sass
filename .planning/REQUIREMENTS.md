# Requirements: ProSell SaaS

**Defined:** 2026-03-15
**Source docs:** `docs/REQUIREMENTS-SPRINT-7-MARKETPLACE.md`, `docs/ROADMAP-PROSELL-SAAS-V3-PIVOT.md`, `docs/02_REQUISITOS_PRD_PROSELL_SAAS_V2.md`, PRPs Sprint 7 Phase 3-7
**Core Value:** El vendedor de ProSell puede publicar cualquier vehículo en Facebook Marketplace desde la app, capturar el lead interesado, y confirmar la cita con el dealer — todo sin salir del panel interno.

---

## Execution Strategy

Los 46 requirements v1 se ejecutan en **dos fases inmediatas**:

| Fase | Scope | Objetivo |
|------|-------|----------|
| **A — Core MVP** | PUBLISH (excl. 08), SCRAPE, CATALOG, DASH, LEAD, APPT | Salir a producción con los 5 dealers, validar flujo de dinero, scraper acumulando datos |
| **B — Visibility** | LAND, CAT-PUBLIC, PUBLISH-08 (AI titles), MKTL | Post-estabilización: catálogo público, landing, inteligencia de mercado con datos reales |

**Ganancia:** Dealers pagando mientras se pule el frontend público. Datos reales de CarGurus acumulándose en Fase A para que el market intelligence de Fase B sea con datos reales, no simulados.

---

## v1 Requirements

### Publishing — Hybrid Publisher (Graph API + Playwright)

> **Nota crítica:** Playwright es el publisher **primario** (inmediato). Graph API es el secundario (post App Review de Facebook). Los posts de FB Marketplace expiran en 7 días.

- [ ] **PUBLISH-01**: Sistema publica un vehículo en FB Marketplace via Playwright con anti-detection (typing realista, delays, viewport estándar, User-Agent humano)
- [ ] **PUBLISH-02**: Sistema publica via Graph API cuando los permisos de FB App están aprobados (fallback → primario)
- [ ] **PUBLISH-03**: Sistema detecta cuál estrategia usar (Playwright vs Graph API) según disponibilidad/aprobación
- [ ] **PUBLISH-04**: Vendedor puede actualizar precio, descripción o fotos de un listing activo desde la app
- [ ] **PUBLISH-05**: Vendedor puede marcar un vehículo como vendido y el listing se elimina de FB automáticamente
- [ ] **PUBLISH-06**: Sistema re-publica automáticamente listings que van a vencer (scheduler, posts expiran a 7 días)
- [ ] **PUBLISH-07**: Entidad Publication con estado máquina: pending / published / failed / expired / sold
- [ ] **PUBLISH-08**: Sistema genera títulos y descripciones optimizados para CTR con IA (GPT-4/Claude)
- [ ] **PUBLISH-09**: Sistema aplica rate limiting (token bucket) para no exceder cuotas de Graph API y evitar baneos
- [ ] **PUBLISH-10**: Sistema optimiza imágenes antes de upload (compresión, resolución FB-compatible)

### Scraping — Inventory Sync

> **Nota:** Scraping cubre dos propósitos: (1) sincronización automática del inventario del dealer, (2) inteligencia de mercado para pricing.

- [ ] **SCRAPE-01**: Scraper detecta cambios diarios en el sitio web del dealer (nuevos vehículos, vendidos)
- [ ] **SCRAPE-02**: Scraper hace scraping incremental (solo procesa páginas que cambiaron)
- [ ] **SCRAPE-03**: IA extrae datos estructurados (make, model, year, price, VIN) desde HTML no estructurado del dealer
- [ ] **SCRAPE-04**: Scraper extrae precios de vehículos comparables desde CarGurus para benchmarking de mercado
- [ ] **SCRAPE-05**: Datos scrapeados se normalizan y almacenan con deduplicación (no crear duplicados)
- [ ] **SCRAPE-06**: Cuando scraper detecta que un vehículo se vendió en el dealer, marca el producto como vendido en ProSell
- [ ] **SCRAPE-07**: Sistema opera con anti-detection y rate limiting para evitar bloqueos

### Catalog & Roles

- [ ] **CATALOG-01**: Vendedor ve catálogo interno de todos los vehículos de sus dealers asignados con estado de publicación
- [ ] **CATALOG-02**: Admin ProSell ve catálogo global de todas las organizaciones
- [ ] **CATALOG-03**: Dealer ve y modifica solo su propio inventario
- [ ] **CATALOG-04**: Cada vehículo muestra precio propio vs precio promedio de mercado (delta %) desde datos de CarGurus
- [ ] **CATALOG-05**: Admin puede crear un dealer sin cuenta de usuario (solo tenant_id como identificador)
- [ ] **CATALOG-06**: Vendedor usa su propia cuenta de Facebook para publicar (no la cuenta del dealer)
- [ ] **CATALOG-07**: Admin puede asignar vendedores a dealers; Manager puede asignar vendedores de su equipo

### Dashboards (Role-Based)

- [ ] **DASH-01**: Dashboard Admin: publicaciones/día, leads globales, performance por vendedor, estado de API
- [ ] **DASH-02**: Dashboard Manager: métricas de su equipo, dealers asignados, publicaciones pendientes
- [ ] **DASH-03**: Dashboard Vendedor: mis publicaciones activas, leads asignados, citas de hoy, métricas personales
- [ ] **DASH-04**: Dashboard Dealer: inventario propio, publicaciones activas en FB, sin acceso a leads

### Leads

- [ ] **LEAD-01**: Sistema captura leads via webhooks de Facebook cuando un usuario contacta un listing
- [ ] **LEAD-02**: Worker de polling consulta Graph API periódicamente como failsafe del webhook
- [ ] **LEAD-03**: Vendedor puede registrar un lead manualmente (nombre, contacto, vehículo, fuente)
- [ ] **LEAD-04**: Lead queda vinculado al listing y al vehículo para trazabilidad de conversión
- [ ] **LEAD-05**: Lead tiene estado: new / contacted / qualified / appointment_set / lost

### Appointments

- [ ] **APPT-01**: Vendedor puede crear una cita vinculando Lead → Vehicle → Dealer con fecha y hora
- [ ] **APPT-02**: Cita tiene estado: pending / confirmed / completed / cancelled
- [ ] **APPT-03**: Al confirmar la cita, el dealer recibe notificación por email con datos del interesado y vehículo
- [ ] **APPT-04**: Vendedor ve todas sus citas con filtros por estado, dealer y fecha

### Market Intelligence (básico)

- [ ] **MKTL-01**: Sistema calcula precio promedio de mercado por año/make/model/millaje/condición desde datos scrapeados
- [ ] **MKTL-02**: Dashboard muestra indicador: precio propio BAJO / EN RANGO / ALTO vs mercado
- [ ] **MKTL-03**: Admin ve historial de precios del mercado por segmento (últimas N semanas)

### Landing Temporal (Sprint 8.5)

- [ ] **LAND-01**: Landing estática temporal muestra lista de vehículos disponibles para publicar en FB
- [ ] **LAND-02**: Dashboard básico público muestra publicaciones/día y time-to-publish (métricas de servicio)

### Catálogo Público (Sprint 9)

- [ ] **CAT-PUBLIC-01**: Catálogo público accesible por URL con listado de vehículos por dealer/organización
- [ ] **CAT-PUBLIC-02**: Búsqueda y filtros avanzados (make, model, year, price range, condición)
- [ ] **CAT-PUBLIC-03**: SEO dinámico (metadata por vehículo) con LCP < 2.5s
- [ ] **CAT-PUBLIC-04**: Paginación optimizada e imágenes con next/image

---

## v2 Requirements

### AI Vendor Assistant (Sprint 7 Phase 6 — depende de WhatsApp Business API + n8n)

- **AI-01**: Asistente IA conversa con leads vía WhatsApp/Messenger y los califica automáticamente
- **AI-02**: IA ofrece vehículos similares si el interesado no cierra con el original
- **AI-03**: Solo leads calificados (alta intención) se envían a vendedor humano
- **AI-04**: Integración n8n → Odoo CRM para lead calificado

### Repricing automático

- **MKTL-V2-01**: IA detecta precio alto y actualiza automáticamente el listing en FB
- **MKTL-V2-02**: Alertas automáticas de repricing sin intervención del vendedor

### Multi-niche / Expansión

- **NICHE-V2-01**: Soporte para Real Estate (mismo stack, diferente FieldConfig por categoría)
- **NICHE-V2-02**: Soporte para otros nichos sobre la base genérica

### Sales System (Sprint 10-11)

- **SALES-V2-01**: Registro de venta vinculado a cita completada
- **SALES-V2-02**: Comisiones por vendedor calculadas automáticamente
- **SALES-V2-03**: MLM teams con distribución de comisiones

### Wallet & Tokens (Sprint 12)

- **WALLET-V2-01**: Billetera virtual con tokens para servicios ProSell
- **WALLET-V2-02**: Sistema de prepago por publicaciones o paquetes de servicio

### Analytics IA (Sprint 13-16)

- **ANALYTICS-V2-01**: Precio promedio histórico por segmento con tendencias
- **ANALYTICS-V2-02**: Predicción de precio con ML (requiere dataset limpio de N meses)
- **ANALYTICS-V2-03**: Recomendaciones automáticas de precio con justificación

---

## Out of Scope (v1)

| Feature | Reason |
|---------|--------|
| Ecommerce con pagos | No es el modelo: ProSell cobra al dealer, no al comprador |
| AI Vendor Assistant | Depende de WhatsApp Business API + n8n + Odoo — post-MVP |
| Repricing automático | Requiere dataset limpio primero; v1 solo muestra delta |
| Mobile app | Web-first |
| Billing/subscriptions | Facturación manual con los 5 dealers actuales — post-MVP |
| AutoTrader / Craigslist | CarGurus es el benchmark suficiente para v1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PUBLISH-01 | Phase 1 — Hybrid Publisher | Pending |
| PUBLISH-02 | Phase 1 — Hybrid Publisher | Pending |
| PUBLISH-03 | Phase 1 — Hybrid Publisher | Pending |
| PUBLISH-04 | Phase 1 — Hybrid Publisher | Pending |
| PUBLISH-05 | Phase 1 — Hybrid Publisher | Pending |
| PUBLISH-06 | Phase 1 — Hybrid Publisher | Pending |
| PUBLISH-07 | Phase 1 — Hybrid Publisher | Pending |
| PUBLISH-08 | Phase 7 — Visibility | Pending |
| PUBLISH-09 | Phase 1 — Hybrid Publisher | Pending |
| PUBLISH-10 | Phase 1 — Hybrid Publisher | Pending |
| SCRAPE-01 | Phase 3 — Scraping | Pending |
| SCRAPE-02 | Phase 3 — Scraping | Pending |
| SCRAPE-03 | Phase 3 — Scraping | Pending |
| SCRAPE-04 | Phase 3 — Scraping | Pending |
| SCRAPE-05 | Phase 3 — Scraping | Pending |
| SCRAPE-06 | Phase 3 — Scraping | Pending |
| SCRAPE-07 | Phase 3 — Scraping | Pending |
| CATALOG-01 | Phase 2 — Catalog & Roles | Pending |
| CATALOG-02 | Phase 2 — Catalog & Roles | Pending |
| CATALOG-03 | Phase 2 — Catalog & Roles | Pending |
| CATALOG-04 | Phase 2 — Catalog & Roles | Pending |
| CATALOG-05 | Phase 2 — Catalog & Roles | Pending |
| CATALOG-06 | Phase 2 — Catalog & Roles | Pending |
| CATALOG-07 | Phase 2 — Catalog & Roles | Pending |
| DASH-01 | Phase 5 — Dashboards | Pending |
| DASH-02 | Phase 5 — Dashboards | Pending |
| DASH-03 | Phase 5 — Dashboards | Pending |
| DASH-04 | Phase 5 — Dashboards | Pending |
| LEAD-01 | Phase 4 — Leads & Appointments | Pending |
| LEAD-02 | Phase 4 — Leads & Appointments | Pending |
| LEAD-03 | Phase 4 — Leads & Appointments | Pending |
| LEAD-04 | Phase 4 — Leads & Appointments | Pending |
| LEAD-05 | Phase 4 — Leads & Appointments | Pending |
| APPT-01 | Phase 4 — Leads & Appointments | Pending |
| APPT-02 | Phase 4 — Leads & Appointments | Pending |
| APPT-03 | Phase 4 — Leads & Appointments | Pending |
| APPT-04 | Phase 4 — Leads & Appointments | Pending |
| MKTL-01 | Phase 6 — Market Intelligence | Pending |
| MKTL-02 | Phase 6 — Market Intelligence | Pending |
| MKTL-03 | Phase 6 — Market Intelligence | Pending |
| LAND-01 | Phase 7 — Visibility | Pending |
| LAND-02 | Phase 7 — Visibility | Pending |
| CAT-PUBLIC-01 | Phase 7 — Visibility | Pending |
| CAT-PUBLIC-02 | Phase 7 — Visibility | Pending |
| CAT-PUBLIC-03 | Phase 7 — Visibility | Pending |
| CAT-PUBLIC-04 | Phase 7 — Visibility | Pending |

**Coverage:**
- v1 requirements: 46 total (note: source said 43, actual count from file is 46)
- Mapped to phases: 46/46 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 — traceability populated after roadmap creation*
