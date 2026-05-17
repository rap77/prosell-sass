# ProSell SaaS — Milestone C: UX Completion

**Version**: 1.0
**Status**: Active
**Date**: 2026-05-16

---

## Objetivo

Cerrar los 8 gaps de UX identificados en el codebase de ProSell SaaS para completar la experiencia operativa del vendedor/dealer. Las fases A y B (catálogo C3, leads, citas) están 100% completas. Esta milestone entrega las piezas faltantes para que la app sea usable en producción sin links rotos ni flujos huérfanos.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 App Router + React 19 + TypeScript strict |
| Styling | TailwindCSS 4 (sin `var()` en className, usar `cn()`) |
| Estado servidor | TanStack Query v5 (`useQuery`, `useMutation`) |
| Estado cliente | Zustand 5 |
| Formularios | React Hook Form + Zod |
| Backend | FastAPI Python 3.13 + Clean Architecture |
| ORM | SQLAlchemy 2.0 async (`Mapped[]`, `mapped_column`) |
| Auth | JWT en httpOnly cookies, middleware Next.js |

---

## Gaps a resolver

### CRÍTICO

**C1 — Pipeline/Deals (Kanban)**
El flujo lead → deal → cierre no existe en el frontend. No hay rutas `/pipeline/` ni componentes kanban. La entidad Deal no existe en el backend — se representa con el Lead en estado avanzado (`qualified`, `appointment_set`). La vista kanban mostrará leads agrupados por status como columnas del pipeline.

### ALTOS

**A1 — Settings/Notificaciones**
No existe `app/settings/` en ninguna forma. El link "Configuración" en el sidebar navega a `/settings` pero no hay ruta. Necesita página con tabs: Perfil, Notificaciones, Seguridad.

**A2 — Settings/Seguridad**
No existe `app/settings/security/`. Sin UI para cambio de contraseña ni toggle de 2FA. Los endpoints backend para 2FA enable/disable ya existen en `auth_router.py`. Solo falta la UI.

**A3 — Panel de notificaciones**
El header no tiene ícono de campanita. Cero lógica frontend de notificaciones. El backend no tiene endpoint de notificaciones — se implementa con un sistema simplificado de in-app notifications basado en eventos de lead (nuevos leads asignados, cambios de estado).

**A4 — Onboarding**
Cero archivos con "onboard" en el codebase. Sin flujo de primer ingreso. Se implementa como un wizard de 3 pasos (datos org, primer vendedor, primer producto) que se muestra automáticamente en el primer login.

### MEDIOS

**M1 — Publicaciones — ruta accesible**
`PublishForm.tsx` (16.2KB) y `PublishModal.tsx` ya existen en `components/publisher/`. Solo falta `app/(seller)/publications/page.tsx` como entry point en routing. El sidebar ya tiene el link `/publications`.

**M2 — Detalle de ítem de catálogo (view-only)**
Solo existe `/catalog/[id]/edit`. Sin `/catalog/[id]` de lectura. Click en card de catálogo no lleva a ningún lado. Requiere `app/(seller)/catalog/[id]/page.tsx` con info del producto.

**M3 — Páginas de error globales**
Sin `app/not-found.tsx`, `app/error.tsx`. Sin manejo de sesión expirada con página branded.

---

## Criterios de éxito (Definition of Done)

- [ ] `/pipeline` accesible desde sidebar con kanban de leads por status
- [ ] `/settings` accesible con tabs funcionales (Perfil, Notificaciones, Seguridad)
- [ ] `/settings/security` con cambio de contraseña y toggle 2FA conectados al backend
- [ ] Header con ícono de campanita que abre panel de notificaciones
- [ ] `/onboarding` se muestra en primer login y es salteable
- [ ] `/publications` accesible y renderiza `PublishModal` con selector de vehículo
- [ ] `/catalog/[id]` (view-only) accesible desde click en card del catálogo
- [ ] `not-found.tsx` y `error.tsx` branded con estilos ProSell
- [ ] Todos los links del sidebar resuelven a rutas válidas
- [ ] TypeScript strict — cero errores `any`, cero errores de build

---

## Out of Scope (Milestone C)

- Scraping de Facebook Marketplace
- Market intelligence / predicciones de precios
- Catálogo público (SEO, buyers externos)
- Ecommerce / pagos
- App nativa (iOS/Android)
- Analytics avanzado / dashboards de métricas
- Gestión de organizaciones multi-tenant (Phase D+)
- Integraciones con CRMs externos

---

## Orden de implementación recomendado

```
M3 (30min) → M2 (2h) → M1 (3h) → A1+A2 (6h) → A3 (8h) → A4 (8h) → C1 (16h)
```

M3 es bloqueante (las demás páginas necesitan error boundaries globales).
C1 es el más complejo y puede ejecutarse en paralelo con A3/A4 una vez M3 esté listo.
