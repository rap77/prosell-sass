---
name: session-2026-03-26-phase8-discuss-progress-4-areas-complete
description: Phase 8 Discuss-Phase — Layout/DataGrid/Bulk/Roles completos, pendiente Image+Search
type: project
---

# Session 2026-03-26: Phase 8 Discuss-Phase (Progreso)

**Status**: 4 de 6 áreas completadas — Pendiente Image Upload UX + Search Filters
**Commit**: 7ccb68f — "docs(phase8): discuss-phase handoff"
**Handoff**: `.planning/phases/08-layout-shell-.../.continue-here.md`

---

## Áreas Completas

### 1. Layout Structure ✅

**Sidebar: Por Leading Indicators**
- **Operaciones**: Catálogo, Publicaciones
- **Crecimiento**: Leads, Citas
- **Sistema**: Configuración, Logs (Solo Admin/Dealer)
- **Razón**: Organizar por función de negocio obliga enfocarse en lo que genera dinero

**Header: Functional Denso**
- Search global (Cmd+K) — Omnibar para vehículos/leads
- User menu con rol visible
- Breadcrumbs para navegación anidada
- Org Switcher (multi-concesionario)
- **Razón**: Vendedor salta entre sedes constantemente

**Mobile: Hybrid Ergonomic**
- Bottom Navigation (4 iconos): Catálogo, Publicar, Leads, Más (Drawer)
- Drawer lateral para resto (Configuración, Perfil, Logs)
- **Razón**: Reachability — acciones generadoras de dinero a un pulgar

**Keyboard: Performance Shortcuts**
- Cmd+K: Command Palette (search + acciones)
- Esc: Cerrar modales / limpiar búsquedas
- Flechas + Enter: Navegación DataGrid
- **Razón**: Power user workflow — vendedores usan mucho teclado

---

### 2. DataGrid Pattern ✅

**Columnas: Compact (5) + Expandible**
- Foto thumbnail (60x60px)
- Título (Año/Marca/Modelo combinados)
- Precio (formato moneda)
- Estado (Badge colorido)
- Acciones (botón contextual)
- **Expandible**: VIN, Stock, Leads, Citas en fila expandible

**Virtualización: TanStack Virtual (rows)**
- Buffer: 10-15 filas fuera de cámara
- 60fps scroll fluido
- **Razón**: Solo renderiza ~40 filas (20 visibles + buffer)

**Selección: Checkboxes + Shift-click**
- Checkbox por fila + Shift-click para rangos
- Indeterminate checkbox en header (Select All)
- **Floating Action Bar**: "Publicar X seleccionados"
- **Razón**: De 2 clics a 50 seleccionados

**Estados: Badges Coloridos (Semántica Visual)**
- Verde (Published): "Dinero en la mesa"
- Amarillo (Pending): "En proceso"
- Rojo (Failed): "Acción requerida"
- Gris (Draft/Expired): "Inactivo"
- **Razón**: Escaneo de alta velocidad

---

### 3. Bulk Upload Flow ✅

**Validación: Zod en Frontend (Síncrona)**
- Esquema (columnas CSV)
- Tipos (precio es número)
- Estructura (filas vacías, campos obligatorios)
- **Feedback instantáneo**: Modal rojo al soltar CSV si hay error
- **Razón**: Backend limpio — JSON con estructura correcta

**Procesamiento: Chunks (50) + Parallel Workers**
- 3-4 workers Taskiq en paralelo
- Resiliencia: Si chunk falla, solo pierdes 50 no 500
- Uso de memoria predecible
- **Razón**: Error en imagen no bloquea otros 450 autos

**Progreso: Barra + % + ETA**
- Polling cada 2s a /bulk-upload/{job_id}/status
- Redis almacena progreso
- ETA dinámico basado en velocidad chunks
- **Razón**: "ETA: 3 min" elimina ansiedad

**Errores: Best Effort + CSV Descargable**
- Continuar procesando válidas
- Reporte: "450 exitosos | 50 fallidos"
- CSV descargable con filas fallidas + `error_reason`
- **Razón**: Productividad ininterrumpida

---

### 4. Role-based Navigation ✅

**Route Groups: 4 Niveles**
- `(admin)`: Infraestructura (proxies, rotación FB, facturación)
- `(dealer)`: Visión de negocio (ROI, estados de cuenta)
- `(manager)`: Supervisión (DataGrid esteroides, reasignar Leads)
- `(seller)`: Ejecución (solo sus autos/leads/botón)
- **Razón**: Privacidad — evita sellers "roben" clientes

**Middleware: Auth + Role + Tenant**
- Autenticado (cookie/JWT)
- Role machea (user.role vs ruta)
- Tenant scope (tenant_id concesionario)
- **Zero Trust en Edge**: Rebota antes de DB
- **Redirección inteligente**: / → rol → "casa"
- **Razón**: Seguridad nivel bancario

**Fallback: Redirect + Toast**
- Re-direccionar a dashboard del rol
- Toast: "Esa sección es solo para administradores"
- **Razón**: Cero fricción — menos tickets soporte

**Role Source: JWT (15-30 min) + Refresh**
- Stateless — latencia cero
- Access token corto + refresh token
- **Razón**: Máxima velocidad sin sobrecargar DB

---

## Pendiente (Próxima Sesión)

### 5. Image Upload UX (POR DISCUTIR)

**Preguntas**:
- ¿Presigned URLs (direct to Cloud) o via backend?
- ¿Drag & drop vs File picker vs Camera+Gallery?
- ¿Híbrido (presigned + backend async processing)?

### 6. Search Filters (POR DISCUTIR)

**Preguntas**:
- ¿Server-side (URL params) o Client-side (memo) o Hybrid?
- ¿Sidebar collapsible vs Header dropdowns vs Cmd+K as filter?
- ¿Debounce 300ms para híbrido?

---

## Stack Confirmado

**Frontend:**
- Next.js 16 + React 19 + TypeScript 5.5 (strict)
- TanStack Table + Virtual (rows)
- TanStack Query v5 (1min staleTime)
- Zustand 5 + persist
- Shadcn UI + MagicUI + Radix UI

**Backend:**
- FastAPI + Python 3.13
- Taskiq + Redis (chunks 50, parallel workers)
- Cloudinary/S3

**Patterns:**
- Clean Architecture
- Multi-tenant (tenant_id)
- Cookie-based auth (httpOnly)

---

## Decisiones Clave

1. **Layout orientado a resultados** — No por entidades, sino por Leading Indicators
2. **Virtualización obligatoria** — TanStack Virtual rows, no opcional
3. **Procesamiento resilient** — Best effort + CSV errores descargable
4. **Seguridad multi-capa** — Auth + Role + Tenant en middleware edge
5. **JWT corto + Refresh** — 15-30min balance performance/seguridad

---

## Next Actions

1. Discutir Image Upload UX + Search Filters
2. Crear `08-CONTEXT.md` con todas las decisiones
3. `/gsd:plan-phase 8` → RESEARCH.md + VALIDATION.md + PLAN.md

---

**Session Metadata**
- Fecha: 2026-03-26 23:00 UTC
- Duración: ~1.5 horas
- Contexto usado: 84%
- Próxima: /clear → continuar sesión
