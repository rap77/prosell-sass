# ProSell SaaS — Milestone C: UX Completion

> **MasterMind operational file:** keep task headers and checkbox structure stable for `/mm:complete-task`.
> **Plan de referencia:** `tasks/plan.md`
> **Spec:** `SPEC.md`
> **Milestone anterior:** B4 completa ✅ (ver `tasks/todo.md.backup_milestone_b4_complete_20260517`)

**Milestone**: Milestone C — UX Completion
**Status**: Completed
**Last Updated**: 2026-05-21

---

## Cierre formal

Milestone C queda cerrada formalmente el **2026-05-21**.

Resultado del audit:

- **8/8 tasks** completadas
- sin tasks pendientes ni en progreso en el runtime de MasterMind
- bloques UX planeados entregados: error pages, catalog detail, publications, settings/profile, settings/security, notifications, onboarding y pipeline

## Orden de ejecución recomendado

1. M3 → M2 → M1 (foundation, sin dependencias entre sí)
2. A1 + A2 (settings; A2 depende de A1)
3. A3 (notificaciones, independiente)
4. A4 (onboarding, independiente)
5. C1 (pipeline, puede ejecutarse en paralelo con A3/A4)

---

- [x] M3: Páginas de error globales⏱️ **Estimate**: N/A | **Actual**: in progress | **Deviation**: — | **Progress**: 4/4 (100%)
      📊 **Avg/subtask**: — | **ETA**: in progress
  - [x] M3.01: Crear `app/not-found.tsx` con branding ProSell (logo, mensaje claro, CTA a dashboard)
  - [x] M3.02: Crear `app/error.tsx` (Client Component) con mensaje amigable y botón "Intentar de nuevo"
  - [x] M3.03: Verificar TypeScript strict sin errores en ambos archivos
  - [x] M3.04: Verificar que el build pasa (`pnpm typecheck`)

- [x] M2: Detalle de ítem de catálogo (view-only)⏱️ **Estimate**: 2h | **Actual**: done | **Deviation**: — | **Progress**: 7/7 (100%)
      📊 **Avg/subtask**: — | **ETA**: done
  - [x] M2.01: Crear `app/(seller)/catalog/[id]/page.tsx` (Server Component, fetch del producto)
  - [x] M2.02: Renderizar datos del producto (título, precio, atributos del vehículo)
  - [x] M2.03: Integrar `ProductImageGallery` para mostrar imágenes
  - [x] M2.04: Agregar botón "Editar" que navega a `/catalog/[id]/edit`
  - [x] M2.05: Modificar `DataGrid.tsx` para que click en row navegue a `/catalog/[id]`
  - [x] M2.06: Implementar loading state (skeleton) y error state con mensaje
  - [x] M2.07: Verificar TypeScript strict sin errores

- [x] M1: Publicaciones — ruta accesible⏱️ **Estimate**: (3h) | **Actual**: 55.0m | **Deviation**: N/A | **Progress**: 7/7 (100%)
      📊 **Avg/subtask**: 7.9m | **ETA**: 55.0m
  - [x] M1.01: Crear `app/(seller)/publications/page.tsx` con lista de publicaciones del tenant
  - [x] M1.02: Agregar botón "Nueva publicación" que abre `PublishModal`
  - [x] M1.03: Verificar/extender `publisherApi.ts` con hook de lista si falta
  - [x] M1.04: Mostrar estados de publicación (pending/published/failed) con badges
  - [x] M1.05: Implementar estado vacío con CTA cuando no hay publicaciones
  - [x] M1.06: Verificar que el link "Publicaciones" del sidebar navega correctamente
  - [x] M1.07: Verificar TypeScript strict sin errores

- [x] A1: Settings — estructura y tab Perfil⏱️ **Estimate**: (4h) | **Actual**: 53.0m | **Deviation**: N/A | **Progress**: 9/9 (100%)
      📊 **Avg/subtask**: 5.9m | **ETA**: 53.0m
  - [x] A1.01: Crear `app/settings/layout.tsx` con tabs (Perfil, Notificaciones, Seguridad)
  - [x] A1.02: Crear `app/settings/page.tsx` que redirige a `/settings/profile`
  - [x] A1.03: Crear `app/settings/profile/page.tsx` con formulario de edición de perfil
  - [x] A1.04: Prellenar formulario con datos del usuario autenticado (`useAuth()`)
  - [x] A1.05: Conectar guardado a `PUT /api/v1/users/me` (verificar/crear endpoint si falta)
  - [x] A1.06: Crear `app/settings/notifications/page.tsx` (placeholder con toggles)
  - [x] A1.07: Crear `lib/api/userApi.ts` con hook `useUpdateProfile`
  - [x] A1.08: Toast de éxito al guardar cambios
  - [x] A1.09: Verificar TypeScript strict sin errores

- [x] A2: Settings/Seguridad — cambio de contraseña y 2FA⏱️ **Estimate**: (4h) | **Actual**: 1.1h | **Deviation**: N/A | **Progress**: 9/9 (100%)
      📊 **Avg/subtask**: 7.3m | **ETA**: 1.1h
  - [x] A2.01: Crear `app/settings/security/page.tsx` con sección "Cambiar contraseña"
  - [x] A2.02: Implementar formulario con validación (mínimo 8 chars, confirmación igual)
  - [x] A2.03: Conectar a `POST /api/v1/auth/change-password`
  - [x] A2.04: Mostrar estado de 2FA (habilitado/deshabilitado) correctamente
  - [x] A2.05: Flujo "Habilitar 2FA" navega a `/auth/setup-2fa`
  - [x] A2.06: Flujo "Deshabilitar 2FA" con modal de confirmación → `POST /api/v1/auth/disable-2fa`
  - [x] A2.07: Mapear errores del backend a mensajes en español
  - [x] A2.08: Extender `lib/api/userApi.ts` con hook `useChangePassword`
  - [x] A2.09: Verificar TypeScript strict sin errores

- [x] A3: Panel de notificaciones en header
  - [x] A3.01: Crear modelo `Notification` en `domain/entities/notification.py`
  - [x] A3.02: Crear Alembic migration para tabla `notifications`
  - [x] A3.03: Crear `INotificationRepository` + implementación SQLAlchemy
  - [x] A3.04: Crear `GET /api/v1/notifications` (lista paginada, últimas 20, con auth)
  - [x] A3.05: Crear `PUT /api/v1/notifications/{id}/read` y `PUT /api/v1/notifications/read-all`
  - [x] A3.06: Hook en `CreateLeadUseCase` para crear notificación al asignar lead
  - [x] A3.07: Crear `NotificationBell.tsx` en `components/layout/` (ícono + badge de count)
  - [x] A3.08: Crear panel dropdown con lista de notificaciones (título, cuerpo, tiempo relativo)
  - [x] A3.09: Crear hook `useNotifications` con polling cada 30s
  - [x] A3.10: Integrar `NotificationBell` en `Header.tsx`
  - [x] A3.11: Click en notificación navega al recurso y la marca como leída
  - [x] A3.12: "Marcar todas como leídas" funcional
  - [x] A3.13: Verificar TypeScript strict sin errores en frontend

- [x] A4: Onboarding — wizard de primer ingreso
  - [x] A4.01: Agregar campo `setup_complete: bool = False` al modelo `Organization`
  - [x] A4.02: Crear Alembic migration para `setup_complete`
  - [x] A4.03: Agregar `PATCH /api/v1/org/me` con `setup_complete: true` al finalizar
  - [x] A4.04: Crear `app/onboarding/page.tsx` con wizard multi-step (3 pasos)
  - [x] A4.05: Crear `OnboardingStep1.tsx` — datos de la organización
  - [x] A4.06: Crear `OnboardingStep2.tsx` — configuración inicial (zona horaria, moneda)
  - [x] A4.07: Crear `OnboardingStep3.tsx` — invitar primer miembro del equipo (opcional)
  - [x] A4.08: Crear `OnboardingProgress.tsx` — barra de progreso (paso 1/3, 2/3, 3/3)
  - [x] A4.09: Botón "Saltar" disponible en cada paso
  - [x] A4.10: Al completar o saltar, marcar org como setup completo y redirigir al dashboard
  - [x] A4.11: Usuarios existentes (`setup_complete=true`) no ven el onboarding
  - [x] A4.12: Verificar TypeScript strict sin errores

- [x] C1: Pipeline/Deals — Kanban de leads
  - [x] C1.01: Agregar item "Pipeline" con ícono `TrendingUp` al sidebar (`Sidebar.tsx`)
  - [x] C1.02: Crear `app/(seller)/pipeline/page.tsx` (container del kanban)
  - [x] C1.03: Crear `KanbanBoard.tsx` con layout de 4 columnas activas (New, Contacted, Qualified, Appointment Set)
  - [x] C1.04: Crear `KanbanColumn.tsx` con header (status, count leads, suma precios)
  - [x] C1.05: Crear `LeadCard.tsx` (nombre buyer, vehículo de interés, tiempo en stage, avatar vendedor)
  - [x] C1.06: Instalar/verificar `@dnd-kit/core` en `apps/web/package.json`
  - [x] C1.07: Implementar drag-and-drop — al soltar ejecuta `PUT /api/v1/leads/{id}/status`
  - [x] C1.08: Validar transiciones inválidas en UI antes de llamar al backend
  - [x] C1.09: Toast de error si transición inválida, sin persistir el cambio
  - [x] C1.10: Selector de vendedor filtra el board por `vendedor_id`
  - [x] C1.11: Vista mobile degrada a lista vertical
  - [x] C1.12: Evaluar y crear `GET /api/v1/leads/pipeline` si se elige grouping en backend
  - [x] C1.13: Verificar TypeScript strict sin errores
