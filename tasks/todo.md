# ProSell SaaS — Milestone C: UX Completion

> **MasterMind operational file:** keep task headers and checkbox structure stable for `/mm:complete-task`.
> **Plan de referencia:** `tasks/plan.md`
> **Spec:** `SPEC.md`
> **Milestone anterior:** B4 completa ✅ (ver `tasks/todo.md.backup_milestone_b4_complete_20260517`)

**Milestone**: Milestone C — UX Completion
**Status**: Active
**Last Updated**: 2026-05-17

---

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

- [x] M1: Publicaciones — ruta accesible⏱️ **Estimate**: 3h | **Actual**: done | **Deviation**: — | **Progress**: 7/7 (100%)
📊 **Avg/subtask**: — | **ETA**: done

  - [x] M1.01: Crear `app/(seller)/publications/page.tsx` con lista de publicaciones del tenant
  - [x] M1.02: Agregar botón "Nueva publicación" que abre `PublishModal`
  - [x] M1.03: Verificar/extender `publisherApi.ts` con hook de lista si falta
  - [x] M1.04: Mostrar estados de publicación (pending/published/failed) con badges
  - [x] M1.05: Implementar estado vacío con CTA cuando no hay publicaciones
  - [x] M1.06: Verificar que el link "Publicaciones" del sidebar navega correctamente
  - [x] M1.07: Verificar TypeScript strict sin errores

- [ ] A1: Settings — estructura y tab Perfil
  - [ ] A1.01: Crear `app/settings/layout.tsx` con tabs (Perfil, Notificaciones, Seguridad)
  - [ ] A1.02: Crear `app/settings/page.tsx` que redirige a `/settings/profile`
  - [ ] A1.03: Crear `app/settings/profile/page.tsx` con formulario de edición de perfil
  - [ ] A1.04: Prellenar formulario con datos del usuario autenticado (`useAuth()`)
  - [ ] A1.05: Conectar guardado a `PUT /api/v1/users/me` (verificar/crear endpoint si falta)
  - [ ] A1.06: Crear `app/settings/notifications/page.tsx` (placeholder con toggles)
  - [ ] A1.07: Crear `lib/api/userApi.ts` con hook `useUpdateProfile`
  - [ ] A1.08: Toast de éxito al guardar cambios
  - [ ] A1.09: Verificar TypeScript strict sin errores

- [ ] A2: Settings/Seguridad — cambio de contraseña y 2FA
  - [ ] A2.01: Crear `app/settings/security/page.tsx` con sección "Cambiar contraseña"
  - [ ] A2.02: Implementar formulario con validación (mínimo 8 chars, confirmación igual)
  - [ ] A2.03: Conectar a `POST /api/v1/auth/change-password`
  - [ ] A2.04: Mostrar estado de 2FA (habilitado/deshabilitado) correctamente
  - [ ] A2.05: Flujo "Habilitar 2FA" navega a `/auth/setup-2fa`
  - [ ] A2.06: Flujo "Deshabilitar 2FA" con modal de confirmación → `POST /api/v1/auth/disable-2fa`
  - [ ] A2.07: Mapear errores del backend a mensajes en español
  - [ ] A2.08: Extender `lib/api/userApi.ts` con hook `useChangePassword`
  - [ ] A2.09: Verificar TypeScript strict sin errores

- [ ] A3: Panel de notificaciones en header
  - [ ] A3.01: Crear modelo `Notification` en `domain/entities/notification.py`
  - [ ] A3.02: Crear Alembic migration para tabla `notifications`
  - [ ] A3.03: Crear `INotificationRepository` + implementación SQLAlchemy
  - [ ] A3.04: Crear `GET /api/v1/notifications` (lista paginada, últimas 20, con auth)
  - [ ] A3.05: Crear `PUT /api/v1/notifications/{id}/read` y `PUT /api/v1/notifications/read-all`
  - [ ] A3.06: Hook en `CreateLeadUseCase` para crear notificación al asignar lead
  - [ ] A3.07: Crear `NotificationBell.tsx` en `components/layout/` (ícono + badge de count)
  - [ ] A3.08: Crear panel dropdown con lista de notificaciones (título, cuerpo, tiempo relativo)
  - [ ] A3.09: Crear hook `useNotifications` con polling cada 30s
  - [ ] A3.10: Integrar `NotificationBell` en `Header.tsx`
  - [ ] A3.11: Click en notificación navega al recurso y la marca como leída
  - [ ] A3.12: "Marcar todas como leídas" funcional
  - [ ] A3.13: Verificar TypeScript strict sin errores en frontend

- [ ] A4: Onboarding — wizard de primer ingreso
  - [ ] A4.01: Agregar campo `setup_complete: bool = False` al modelo `Organization`
  - [ ] A4.02: Crear Alembic migration para `setup_complete`
  - [ ] A4.03: Agregar `PATCH /api/v1/org/me` con `setup_complete: true` al finalizar
  - [ ] A4.04: Crear `app/onboarding/page.tsx` con wizard multi-step (3 pasos)
  - [ ] A4.05: Crear `OnboardingStep1.tsx` — datos de la organización
  - [ ] A4.06: Crear `OnboardingStep2.tsx` — configuración inicial (zona horaria, moneda)
  - [ ] A4.07: Crear `OnboardingStep3.tsx` — invitar primer miembro del equipo (opcional)
  - [ ] A4.08: Crear `OnboardingProgress.tsx` — barra de progreso (paso 1/3, 2/3, 3/3)
  - [ ] A4.09: Botón "Saltar" disponible en cada paso
  - [ ] A4.10: Al completar o saltar, marcar org como setup completo y redirigir al dashboard
  - [ ] A4.11: Usuarios existentes (`setup_complete=true`) no ven el onboarding
  - [ ] A4.12: Verificar TypeScript strict sin errores

- [ ] C1: Pipeline/Deals — Kanban de leads
  - [ ] C1.01: Agregar item "Pipeline" con ícono `TrendingUp` al sidebar (`Sidebar.tsx`)
  - [ ] C1.02: Crear `app/(seller)/pipeline/page.tsx` (container del kanban)
  - [ ] C1.03: Crear `KanbanBoard.tsx` con layout de 4 columnas activas (New, Contacted, Qualified, Appointment Set)
  - [ ] C1.04: Crear `KanbanColumn.tsx` con header (status, count leads, suma precios)
  - [ ] C1.05: Crear `LeadCard.tsx` (nombre buyer, vehículo de interés, tiempo en stage, avatar vendedor)
  - [ ] C1.06: Instalar/verificar `@dnd-kit/core` en `apps/web/package.json`
  - [ ] C1.07: Implementar drag-and-drop — al soltar ejecuta `PUT /api/v1/leads/{id}/status`
  - [ ] C1.08: Validar transiciones inválidas en UI antes de llamar al backend
  - [ ] C1.09: Toast de error si transición inválida, sin persistir el cambio
  - [ ] C1.10: Selector de vendedor filtra el board por `vendedor_id`
  - [ ] C1.11: Vista mobile degrada a lista vertical
  - [ ] C1.12: Evaluar y crear `GET /api/v1/leads/pipeline` si se elige grouping en backend
  - [ ] C1.13: Verificar TypeScript strict sin errores
