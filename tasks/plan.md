# ProSell SaaS — Milestone C: UX Completion

> **MasterMind operational file:** keep task headers, acceptance-criteria blocks, and task ordering stable for `/mm:complete-task`.
> **Spec de referencia:** `SPEC.md` (raíz del proyecto)
> **Estado ejecutivo:** `docs/mvp-status.md`

**Milestone**: Milestone C — UX Completion
**Version**: 1.0
**Status**: Active
**Last Updated**: 2026-05-16

---

## Overview

Esta milestone cierra los 8 gaps de UX identificados para dejar la app operativa en producción. Las fases A y B (catálogo C3, leads, citas) están completas. Cada task a continuación es autocontenida y puede ser ejecutada por `/mm:complete-task`.

**Orden de ejecución recomendado** (respeta dependencias):
1. M3 → M2 → M1 (foundation, sin dependencias entre sí)
2. A1 + A2 (settings, A2 depende de A1)
3. A3 (notificaciones, independiente)
4. A4 (onboarding, independiente)
5. C1 (pipeline, puede ejecutarse en paralelo con A3/A4)

---

## M3: Páginas de error globales (1h)

**Priority**: 🟡 MEDIO (bloqueante para UX en producción)
**Objective**: Crear `not-found.tsx`, `error.tsx` y manejo de sesión expirada con branding ProSell. Estas páginas son críticas para que cualquier ruta rota muestre algo coherente en lugar del 404 genérico de Next.js.

**Implementation**:
- `app/not-found.tsx`: Server Component con layout ProSell branded, link de regreso al dashboard
- `app/error.tsx`: Client Component (required by Next.js) con mensaje de error y botón de retry
- Ambos siguen el mismo patrón visual que `auth/login/LoginPageContent.tsx` (gradiente slate, centrado)
- Para sesión expirada: el middleware ya redirige a `/auth/login`. No requiere página adicional.

**Acceptance Criteria**:
- [ ] `app/not-found.tsx` renderiza con branding ProSell (logo, mensaje claro, CTA a dashboard)
- [ ] `app/error.tsx` renderiza con mensaje amigable y botón "Intentar de nuevo"
- [ ] Ambos archivos pasan TypeScript strict sin errores
- [ ] No rompen el build (`pnpm typecheck`)

**Files**:
- `apps/web/src/app/not-found.tsx` (new)
- `apps/web/src/app/error.tsx` (new)

---

## M2: Detalle de ítem de catálogo (view-only) (2h)

**Priority**: 🟡 MEDIO
**Objective**: Crear la página de detalle del producto `/catalog/[id]` en modo lectura. Actualmente solo existe `/catalog/[id]/edit`. El click en cualquier card del catálogo no lleva a ningún lado — esta página cierra ese gap.

**Implementation**:
- `app/(seller)/catalog/[id]/page.tsx`: Server Component que hace fetch del producto
- Usa el hook existente de la API (`useProduct` de `lib/api/products.ts`, o fetch directo si no existe)
- Muestra: título, precio, estado (badge), atributos del vehículo (año, marca, modelo, VIN, etc.)
- Usa `ProductImageGallery` (ya existe en `components/catalog/ProductImageGallery.tsx`)
- Botones de acción: "Editar" → `/catalog/[id]/edit`, "Publicar" → abre `PublishModal`
- Loading state con skeleton, error state con mensaje
- El componente `DataGrid` ya renderiza cards con click → agregar `onClick` que navega a `/catalog/{id}`

**Acceptance Criteria**:
- [ ] `/catalog/[id]` renderiza datos del producto (título, precio, atributos)
- [ ] `ProductImageGallery` muestra imágenes del vehículo
- [ ] Botón "Editar" navega a `/catalog/[id]/edit`
- [ ] Click en card del catálogo navega a `/catalog/[id]` (modificar `DataGrid` o `ActionMenu`)
- [ ] Loading y error states funcionan correctamente
- [ ] TypeScript strict sin errores

**Files**:
- `apps/web/src/app/(seller)/catalog/[id]/page.tsx` (new)
- `apps/web/src/components/datagrid/DataGrid.tsx` (modify — agregar navegación al click en row)

---

## M1: Publicaciones — ruta accesible (3h)

**Priority**: 🟡 MEDIO
**Objective**: Crear la página `/publications` que actúa como entry point para el flujo de publicación en Facebook Marketplace. `PublishForm.tsx` y `PublishModal.tsx` ya existen — solo falta la ruta y el wire-up.

**Implementation**:
- `app/(seller)/publications/page.tsx`: Lista de publicaciones del tenant con estado por vehículo
- Columnas: vehículo, plataforma (Facebook), estado (published/pending/failed), fecha
- Botón "Nueva publicación" abre `PublishModal` con selector de vehículo del catálogo
- Usa `publisherApi.ts` existente para cargar publicaciones: `GET /api/v1/publications` (verificar si existe, si no usa `GET /api/v1/products?status=published`)
- Estado vacío con CTA claro cuando no hay publicaciones
- El sidebar ya tiene el link `/publications` — esta página lo activa

**Acceptance Criteria**:
- [ ] `/publications` accesible y renderiza lista (o estado vacío) de publicaciones
- [ ] Botón "Nueva publicación" abre `PublishModal` correctamente
- [ ] `PublishModal` puede seleccionar un vehículo del catálogo y publicar
- [ ] Estados de la publicación (pending/published/failed) visibles con badges
- [ ] El link "Publicaciones" en el sidebar navega correctamente
- [ ] TypeScript strict sin errores

**Files**:
- `apps/web/src/app/(seller)/publications/page.tsx` (new)
- `apps/web/src/lib/api/publisherApi.ts` (verify/modify — agregar hook de lista si falta)

---

## A1: Settings — estructura y tab Perfil (4h)

**Priority**: 🔴 ALTO
**Objective**: Crear la página `/settings` con estructura de tabs (Perfil, Notificaciones, Seguridad) y la pestaña Perfil funcional. El link "Configuración" en el sidebar lleva a `/settings` — actualmente da 404.

**Implementation**:
- `app/settings/layout.tsx`: Layout con tabs de navegación (Perfil, Notificaciones, Seguridad)
- `app/settings/page.tsx`: Redirect a `/settings/profile`
- `app/settings/profile/page.tsx`: Formulario de edición de perfil (nombre, email, teléfono)
- `app/settings/notifications/page.tsx`: Placeholder con toggles de notificaciones
- Usa el hook `useAuth()` para prellenar datos del usuario
- `PUT /api/v1/users/me` para guardar (verificar si existe el endpoint, si no se agrega stub)
- React Hook Form + Zod para validación
- Toast de éxito/error con `sonner`

**Acceptance Criteria**:
- [ ] `/settings` redirige a `/settings/profile`
- [ ] Tabs de navegación: Perfil, Notificaciones, Seguridad visibles y funcionales
- [ ] Formulario de perfil prellenado con datos del usuario autenticado
- [ ] Guardado de perfil conectado al backend (PUT /api/v1/users/me o equivalente)
- [ ] Toast de éxito al guardar cambios
- [ ] Tab Notificaciones renderiza (aunque sea placeholder)
- [ ] TypeScript strict sin errores

**Files**:
- `apps/web/src/app/settings/layout.tsx` (new)
- `apps/web/src/app/settings/page.tsx` (new — redirect)
- `apps/web/src/app/settings/profile/page.tsx` (new)
- `apps/web/src/app/settings/notifications/page.tsx` (new — placeholder)
- `apps/web/src/lib/api/userApi.ts` (new — hook useUpdateProfile)

---

## A2: Settings/Seguridad — cambio de contraseña y 2FA (4h)

**Priority**: 🔴 ALTO
**Objective**: Crear la pestaña Seguridad en settings con UI para cambio de contraseña y gestión de 2FA. Los endpoints backend ya existen (`/api/v1/auth/enable-2fa`, `/api/v1/auth/disable-2fa`, cambio de contraseña en `auth_router.py`).

**Implementation**:
- `app/settings/security/page.tsx`: Dos secciones: "Cambiar contraseña" y "Autenticación de dos factores"
- Sección contraseña: formulario (contraseña actual, nueva, confirmación) → `POST /api/v1/auth/change-password`
- Sección 2FA: si deshabilitado, botón "Habilitar 2FA" → redirige a `/auth/setup-2fa` (ya existe)
- Si habilitado, botón "Deshabilitar 2FA" → modal de confirmación → `POST /api/v1/auth/disable-2fa`
- Reusar `TwoFactorSetupForm` de `components/auth/TwoFactorSetupForm.tsx` si corresponde
- React Hook Form + Zod para validación de contraseña

**Acceptance Criteria**:
- [ ] Sección "Cambiar contraseña" con validación (mínimo 8 chars, confirmación igual)
- [ ] Guardado conectado al endpoint de cambio de contraseña del backend
- [ ] Estado de 2FA (habilitado/deshabilitado) mostrado correctamente
- [ ] Flujo "Habilitar 2FA" navega a `/auth/setup-2fa`
- [ ] Flujo "Deshabilitar 2FA" con confirmación modal funcional
- [ ] Errores del backend (contraseña incorrecta, etc.) mapeados a mensajes en español
- [ ] TypeScript strict sin errores

**Files**:
- `apps/web/src/app/settings/security/page.tsx` (new)
- `apps/web/src/lib/api/userApi.ts` (modify — agregar useChangePassword hook)

---

## A3: Panel de notificaciones en header (8h)

**Priority**: 🔴 ALTO
**Objective**: Agregar ícono de campanita al header que abre un dropdown/panel de notificaciones. Backend no tiene endpoint de notificaciones — se construye un sistema simplificado con in-app notifications derivadas de eventos de lead.

**Implementation**:

**Backend** (4h):
- Nuevo modelo `Notification` en `domain/entities/notification.py`: `id`, `tenant_id`, `user_id`, `type`, `title`, `body`, `read`, `created_at`, `entity_id`, `entity_type`
- Alembic migration para tabla `notifications`
- `NotificationRepository` (interface + SQLAlchemy impl)
- `GET /api/v1/notifications` — lista de notificaciones del usuario actual (paginado, últimas 20)
- `PUT /api/v1/notifications/{id}/read` — marcar como leída
- `PUT /api/v1/notifications/read-all` — marcar todas como leídas
- Hook en `CreateLeadUseCase` para crear notificación al asignar lead a vendedor

**Frontend** (4h):
- `NotificationBell.tsx` en `components/layout/`: ícono campanita con badge de count
- Panel dropdown con lista de notificaciones (título, cuerpo, tiempo relativo, estado leído/no leído)
- `useNotifications` hook en `lib/api/notifications.ts` con polling cada 30s
- `useMutation` para marcar como leída al hacer click
- Integrar `NotificationBell` en `Header.tsx` (entre search y user menu)
- Estado vacío con mensaje amigable cuando no hay notificaciones

**Acceptance Criteria**:
- [ ] Endpoint `GET /api/v1/notifications` devuelve lista paginada con auth
- [ ] Endpoint `PUT /api/v1/notifications/{id}/read` funciona correctamente
- [ ] Header muestra ícono de campanita con badge cuando hay notificaciones no leídas
- [ ] Panel de notificaciones abre al hacer click en la campanita
- [ ] Notificaciones de nuevo lead asignado aparecen automáticamente
- [ ] Click en notificación navega al recurso correspondiente y la marca como leída
- [ ] "Marcar todas como leídas" funciona
- [ ] Polling cada 30s actualiza el count sin recargar la página
- [ ] TypeScript strict sin errores en frontend

**Files**:
- `apps/api/src/prosell/domain/entities/notification.py` (new)
- `apps/api/src/prosell/domain/ports/i_notification_repository.py` (new)
- `apps/api/src/prosell/infrastructure/repositories/notification_repository_impl.py` (new)
- `apps/api/src/prosell/application/use_cases/notification/create_notification.py` (new)
- `apps/api/src/prosell/infrastructure/api/routers/notification_router.py` (new)
- `apps/api/src/prosell/infrastructure/api/main.py` (modify — registrar router)
- `apps/api/alembic/versions/YYYYMMDD_notifications.py` (new migration)
- `apps/api/src/prosell/application/use_cases/lead/create_lead.py` (modify — trigger notif)
- `apps/web/src/components/layout/NotificationBell.tsx` (new)
- `apps/web/src/lib/api/notifications.ts` (new)
- `apps/web/src/components/layout/Header.tsx` (modify — agregar NotificationBell)

---

## A4: Onboarding — wizard de primer ingreso (8h)

**Priority**: 🔴 ALTO
**Objective**: Crear un wizard de 3 pasos que se muestra en el primer login de un usuario/organización nueva. Sin este flujo, un nuevo tenant no sabe qué hacer al entrar por primera vez.

**Implementation**:
- `app/onboarding/page.tsx`: Wizard multi-step con 3 pasos
  - Paso 1: Datos de la organización (nombre, teléfono, dirección) — usa `OrganizationForm` existente
  - Paso 2: Configuración inicial (zona horaria, moneda) — campos simples
  - Paso 3: Invitar primer miembro del equipo (opcional) — email input con `POST /api/v1/teams/invite`
- Estado del wizard en Zustand o `useReducer` local
- `useAuth()` para saber si es primer login: verificar si `org.setup_complete` es false
- Al completar o saltar: marcar org como setup completo (`PATCH /api/v1/org/me`) y redirigir al dashboard
- Middleware puede verificar el flag y redirigir a `/onboarding` si aplica
- Barra de progreso visual (paso 1/3, 2/3, 3/3)
- Botón "Saltar" disponible en cada paso (no forzar completar)

**Backend** (2h):
- Agregar campo `setup_complete: bool = False` al modelo `Organization`
- Migration para campo `setup_complete`
- `PATCH /api/v1/org/me` con `setup_complete: true` al finalizar onboarding

**Frontend** (6h):
- `app/onboarding/page.tsx` con wizard
- `components/onboarding/OnboardingStep1.tsx` — datos org
- `components/onboarding/OnboardingStep2.tsx` — configuración
- `components/onboarding/OnboardingStep3.tsx` — invitar miembro
- `components/onboarding/OnboardingProgress.tsx` — barra de progreso

**Acceptance Criteria**:
- [ ] Wizard de 3 pasos funcional con navegación adelante/atrás
- [ ] Paso 1 (datos org) guarda con PUT /api/v1/org/me
- [ ] Paso 3 (invitar miembro) es opcional y salteable
- [ ] Botón "Saltar todo" disponible en cualquier paso
- [ ] Al completar, redirige a `/catalog` (o dashboard)
- [ ] Usuarios existentes (setup_complete=true) no ven el onboarding
- [ ] Barra de progreso refleja el paso actual
- [ ] TypeScript strict sin errores

**Files**:
- `apps/web/src/app/onboarding/page.tsx` (new)
- `apps/web/src/components/onboarding/OnboardingStep1.tsx` (new)
- `apps/web/src/components/onboarding/OnboardingStep2.tsx` (new)
- `apps/web/src/components/onboarding/OnboardingStep3.tsx` (new)
- `apps/web/src/components/onboarding/OnboardingProgress.tsx` (new)
- `apps/api/src/prosell/domain/entities/organization.py` (modify — agregar setup_complete)
- `apps/api/src/prosell/infrastructure/api/routers/org_router.py` (modify — PATCH endpoint)
- `apps/api/alembic/versions/YYYYMMDD_org_setup_complete.py` (new migration)

---

## C1: Pipeline/Deals — Kanban de leads (16h)

**Priority**: 🔴 CRÍTICO
**Objective**: Crear la vista kanban de pipeline de ventas en `/pipeline`. No existe entidad Deal en el backend — el pipeline se representa con los Leads agrupados por status como columnas. Esta es la vista operativa central para el vendedor.

**Decisión arquitectónica**: No crear entidad Deal. El pipeline kanban opera sobre Leads directamente. Las columnas del kanban mapean 1:1 con los estados del Lead: `new` → `contacted` → `qualified` → `appointment_set` → (cerrado/lost). Drag-and-drop entre columnas ejecuta el state transition del lead.

**Implementation**:

**Frontend** (12h):
- `app/(seller)/pipeline/page.tsx`: Container del kanban
- `components/pipeline/KanbanBoard.tsx`: Layout de 5 columnas (una por status de Lead)
- `components/pipeline/KanbanColumn.tsx`: Columna individual con header (status, count, total $) y lista de cards
- `components/pipeline/LeadCard.tsx`: Card de lead con nombre buyer, vehículo, tiempo en stage, avatar del vendedor asignado
- Drag-and-drop con `@dnd-kit/core` (verificar si está en `package.json`, si no instalar)
- Al soltar un card en columna diferente: `useMutation` → `PUT /api/v1/leads/{id}/status`
- Validar transiciones inválidas en UI antes de llamar al backend (usar `LeadStatus.transitions()`)
- Toast de error si la transición no es válida
- `useLeads()` ya existe — agregar queryKey y filtros para cargar todos los leads del usuario
- Vista por vendedor (selector en header del board): filtrar `vendedor_id`
- Columna "Lost" colapsable (oculta por default, toggle para mostrar)
- Responsive: en mobile, mostrar como lista en lugar de kanban

**Sidebar** (2h):
- Agregar item "Pipeline" con ícono `TrendingUp` al grupo "ventas" en `Sidebar.tsx`
- Href: `/pipeline`

**Backend** (2h):
- `GET /api/v1/leads/pipeline`: Endpoint optimizado que devuelve leads agrupados por status con metadata (count por columna, total price_cents por columna)
- Puede ser una query SQL con `GROUP BY status` + datos de leads para la columna visible
- Alternativa: el frontend reutiliza `GET /api/v1/leads` sin paginación y agrupa en cliente (más simple, evaluar según performance)

**Acceptance Criteria**:
- [ ] `/pipeline` accesible desde sidebar con item "Pipeline"
- [ ] Kanban muestra 4 columnas activas: New, Contacted, Qualified, Appointment Set
- [ ] Cada columna muestra count de leads y suma de precios de vehículos
- [ ] Cards de lead muestran: nombre buyer, vehículo de interés, tiempo en stage
- [ ] Drag-and-drop funciona y ejecuta state transition en backend
- [ ] Transiciones inválidas (ej: new → appointment_set) muestran error toast y no persisten
- [ ] Selector de vendedor filtra el board por vendedor asignado
- [ ] En mobile, el board degrada a vista de lista vertical
- [ ] TypeScript strict sin errores

**Files**:
- `apps/web/src/app/(seller)/pipeline/page.tsx` (new)
- `apps/web/src/components/pipeline/KanbanBoard.tsx` (new)
- `apps/web/src/components/pipeline/KanbanColumn.tsx` (new)
- `apps/web/src/components/pipeline/LeadCard.tsx` (new)
- `apps/web/src/components/layout/Sidebar.tsx` (modify — agregar item Pipeline)
- `apps/api/src/prosell/infrastructure/api/routers/lead_router.py` (modify — agregar /pipeline endpoint si se elige backend grouping)
- `package.json` en `apps/web` (modify — agregar @dnd-kit/core si no existe)
