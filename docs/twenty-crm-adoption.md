# ProSell CRM Roadmap

**Fecha**: 2026-07-11 — **Fases 1-5: COMPLETAS (verificado 2026-10-07)**
**Objetivo**: CRM vertical para dealers de vehículos con flujo WhatsApp-first

> **Nota de cierre (2026-10-07)**: este roadmap se dio por "no implementado"
> en una sesión posterior, pero verificación real contra el código mostró
> que las Fases 1-3 ya estaban construidas y conectadas (público `/p/[slug]`
>
> - WhatsApp share, captura de leads, vista tabla `LeadList.tsx` + Kanban
>   real con `@dnd-kit/core` en `pipeline/page.tsx`). Esta sesión cerró lo que
>   genuinamente faltaba:
>
> * **Fase 4 (Activities)**: `LeadActivity` (nota/llamada) nuevo — entidad,
>   migración `lead_activities`, repo, `POST/GET /leads/{id}/activities`,
>   embebido en `LeadDetailResponse`; frontend: `LeadTimeline.tsx` (merge
>   cronológico de status-changes + activities), `AddLeadActivityForm.tsx`.
> * **Fase 5 (Automations)**: `NotifyStaleLeadsUseCase` + `AbstractLeadRepository.list_stale()`/`touch()`
>   (idempotente: notificar resetea el reloj de staleness, mismo criterio que
>   `PruneSoldProductImagesUseCase`) + `notify_stale_leads_task.py` (Taskiq,
>   cron diario vía `settings.notify_stale_leads_cron`). Canal de notificación:
>   **in-app únicamente** (reusa `Notification`/`notification_router.py` ya
>   existente) — push y WhatsApp Business API quedaron deliberadamente
>   diferidos (ninguno de los dos tiene infra en este proyecto todavía;
>   agregarlos es una decisión de infra/costo separada, no de código).
> * **Historial de notificaciones**: `NotificationBell.tsx` ya renderizaba
>   cualquier tipo de notificación genéricamente y ya enrutaba clicks de
>   `resource_type: "lead"` a `/vendedor/leads/{id}` — verificado con test
>   nuevo, cero cambios de código necesarios.
> * **Panel de preferencias de notificaciones** (`settings/notifications/page.tsx`):
>   sigue siendo un placeholder de solo-frontend ("las preferencias se
>   guardan localmente... integración con el backend próximamente") — fuera
>   de alcance de esta sesión; wirearlo de verdad requiere una entidad nueva
>   de preferencias persistidas por usuario, no parte de "notificar leads
>   sin actividad".
>
> Todo bajo TDD estricto real (rojo mostrado antes de cada implementación).
> Suite completa: backend 2684 passed, frontend 1517 passed.

## Deuda técnica pendiente (confirmada por el usuario, 2026-10-07)

**Push notifications y WhatsApp Business API/Twilio para Fase 5 —
el usuario confirmó explícitamente que SÍ los quiere**, no es un "tal vez
algún día": quedó diferido en esta sesión solo porque ninguno de los dos
tiene infraestructura en el proyecto todavía (cuenta, credenciales, costo
mensual), no porque no se necesite. Para la próxima sesión que lo tome:

- **Punto de integración ya preparado**: `NotifyStaleLeadsUseCase` (y
  `CreateLeadUseCase`, que ya emite `LEAD_ASSIGNED`) solo llaman a
  `AbstractNotificationRepository.create()` — hoy eso persiste una fila
  in-app. Agregar push/WhatsApp es una nueva responsabilidad de
  **entrega** (delivery), no de negocio: el use case no debería cambiar,
  solo necesita un puerto nuevo (ej. `INotificationDeliveryService` o
  extender el repo) que la capa de infraestructura implemente.
- **WhatsApp Business API / Twilio**: requiere decidir proveedor (Twilio
  vs. Meta WhatsApp Business directo), dar de alta cuenta + credenciales,
  y aceptar el costo mensual recurrente — decisión de producto/infra que
  el usuario debe tomar explícitamente (proveedor, presupuesto), no algo
  para elegir en silencio en una sesión de código.
- **Push notifications**: no hay ningún servicio de push (web push / FCM)
  en `infrastructure/services/` hoy — hay que elegir e integrar uno desde
  cero.
- **Alcance sugerido para cuando se tome**: empezar por el canal que ya
  tiene mayor valor para el flujo WhatsApp-first del proyecto (WhatsApp
  Business API), dado que la Fase 1 ya comparte productos por WhatsApp
  (`wa.me` links) — push queda como canal secundario.

---

## Design System

```css
/* Generado con ui-ux-pro-max */
:root {
  /* Colors - Premium dark + action red */
  --color-primary: #1e293b;
  --color-on-primary: #ffffff;
  --color-secondary: #334155;
  --color-accent: #dc2626;
  --color-background: #f8fafc;
  --color-foreground: #0f172a;
  --color-muted: #e9edf1;
  --color-border: #e2e8f0;
  --color-destructive: #dc2626;

  /* Typography - E-commerce optimized */
  --font-display: "Rubik", sans-serif;
  --font-body: "Nunito Sans", sans-serif;
}
```

**Fonts**: `https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;500;600;700&family=Rubik:wght@300;400;500;600;700&display=swap`

**Style**: Motion-Driven (scroll animations, hover 300ms, parallax)

**Checklist pre-delivery**:

- [ ] No emojis como íconos (usar Heroicons/Lucide)
- [ ] `cursor-pointer` en elementos clickeables
- [ ] Hover states con transiciones 150-300ms
- [ ] Contraste mínimo 4.5:1
- [ ] Focus states visibles para keyboard nav
- [ ] `prefers-reduced-motion` respetado
- [ ] Breakpoints: 375px, 768px, 1024px, 1440px

---

## Git Branches

| Fase | Branch                      | Status                                    |
| ---- | --------------------------- | ----------------------------------------- |
| 1    | `feat/phase-1-mvp-whatsapp` | ✅ Done (verificado 2026-10-07)           |
| 2    | `feat/phase-2-lead-capture` | ✅ Done (verificado 2026-10-07)           |
| 3    | `feat/phase-3-crm-basic`    | ✅ Done (verificado 2026-10-07)           |
| 4    | `feat/phase-4-pipelines`    | ✅ Done (Activities, cerrado 2026-10-07)  |
| 5    | `feat/phase-5-workflows`    | ✅ Done (in-app only, cerrado 2026-10-07) |

---

## FASE 1: MVP WhatsApp (GRATIS)

**Branch**: `feat/phase-1-mvp-whatsapp`
**Duración**: 4-6 semanas
**Precio**: GRATIS
**Twenty concepts**: Ninguno

### Backend

```
apps/api/src/prosell/
├── infrastructure/api/v1/public/
│   └── products.py          # GET /api/v1/public/products/{slug}
└── application/use_cases/
    └── get_public_product.py # Solo status=published
```

**Endpoint**:

```python
@router.get("/products/{slug}")
async def get_public_product(slug: str) -> PublicProductResponse:
    """Solo productos con status=published, sin auth"""
    pass
```

### Frontend

```
apps/web/src/app/
├── p/[slug]/
│   ├── page.tsx              # Server Component con metadata
│   └── ProductDetailPublic.tsx
└── (public)/
    └── layout.tsx            # Nav + Footer de landing
```

### UX/UI Specs

**Página `/p/[slug]`** (Mobile-first):

```
┌─────────────────────────────┐
│  [Logo]           [Nav]     │  ← Sticky header
├─────────────────────────────┤
│                             │
│    ┌───────────────────┐    │
│    │                   │    │
│    │   HERO IMAGE      │    │  ← Galería con swipe
│    │   (16:9)          │    │
│    │                   │    │
│    └───────────────────┘    │
│    [•] [○] [○] [○]          │  ← Dots indicator
│                             │
│  Toyota Corolla 2022        │  ← Rubik 700, 24px
│  ────────────────────       │
│  $25,000 USD                │  ← Accent red, 32px bold
│                             │
│  📍 Caracas, Venezuela      │  ← Muted text
│  🏪 AutoMax Dealers         │  ← Link al dealer
│                             │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐    │
│  │ 📱 COMPARTIR POR    │    │  ← Primary CTA, sticky bottom
│  │    WHATSAPP         │    │     on mobile
│  └─────────────────────┘    │
│                             │
├─────────────────────────────┤
│  DETALLES                   │
│  ─────────────────────      │
│  Año        │ 2022          │
│  Marca      │ Toyota        │
│  Modelo     │ Corolla       │
│  Km         │ 45,000        │
│  Motor      │ 1.8L          │
│  Trans.     │ Automática    │
│                             │
├─────────────────────────────┤
│  DESCRIPCIÓN                │
│  ─────────────────────      │
│  Lorem ipsum dolor sit...   │
│                             │
├─────────────────────────────┤
│         [Footer]            │
└─────────────────────────────┘
```

**Open Graph Meta Tags**:

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  return {
    title: `${product.brand} ${product.model} ${product.year}`,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: `${product.brand} ${product.model} ${product.year} - $${product.price}`,
      description: product.description,
      images: [product.cover_image_url],
      type: "product",
    },
  };
}
```

**WhatsApp Share**:

```typescript
const shareText = `
🚗 ${product.brand} ${product.model} ${product.year}
💰 $${product.price.toLocaleString()}
📍 ${product.location}

${window.location.href}
`.trim();

const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
```

### Tareas

- [ ] Backend: Crear endpoint público `/api/v1/public/products/{slug}`
- [ ] Frontend: Crear layout público `(public)/layout.tsx`
- [ ] Frontend: Crear página `/p/[slug]/page.tsx` con Server Component
- [ ] Frontend: Componente `ProductDetailPublic.tsx` (reusar de CatalogDetailView)
- [ ] Frontend: Galería de imágenes con swipe (mobile)
- [ ] Frontend: Botón "Compartir por WhatsApp" sticky
- [ ] SEO: Open Graph meta tags
- [ ] SEO: Schema.org Product structured data
- [ ] Analytics: Tracking de visitas por producto (opcional)

---

## FASE 2: Lead Capture (GRATIS)

**Branch**: `feat/phase-2-lead-capture`
**Duración**: 2-3 semanas
**Precio**: GRATIS
**Twenty concepts**: Ninguno

### Backend

```python
class Lead(Base):
    id: Mapped[UUID]
    product_id: Mapped[UUID]
    organization_id: Mapped[UUID]  # FK al dealer
    name: Mapped[str]
    phone: Mapped[str]
    message: Mapped[str | None]
    source: Mapped[str]  # whatsapp | web | direct
    created_at: Mapped[datetime]
```

### UX/UI Specs

**Botón "Me Interesa"** en `/p/[slug]`:

```
┌─────────────────────────────┐
│  ┌─────────────────────┐    │
│  │ 💬 ME INTERESA      │    │  ← Secondary CTA
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ 📱 COMPARTIR POR    │    │  ← Primary CTA
│  │    WHATSAPP         │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

**Modal de Contacto** (Sheet desde abajo en mobile):

```
┌─────────────────────────────┐
│  ══════════════════         │  ← Handle para cerrar
│                             │
│  ¿Te interesa este          │
│  vehículo?                  │
│                             │
│  ┌─────────────────────┐    │
│  │ Tu nombre           │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ WhatsApp            │    │  ← Input tel con country
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Mensaje (opcional)  │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │     ENVIAR          │    │
│  └─────────────────────┘    │
│                             │
│  Al enviar, el vendedor     │
│  te contactará por WhatsApp │
└─────────────────────────────┘
```

### Tareas

- [ ] Backend: Modelo `Lead` y migración
- [ ] Backend: POST `/api/v1/public/leads`
- [ ] Backend: Notificación al dealer (email/push)
- [ ] Frontend: Modal/Sheet de contacto
- [ ] Frontend: Validación de teléfono
- [ ] Admin: Vista de leads recibidos (tabla simple)

---

## FASE 3: CRM Básico ($29/mes)

**Branch**: `feat/phase-3-crm-basic`
**Duración**: 4-6 semanas
**Precio**: $29/mes
**Twenty concepts**: Views

### UX/UI Specs

**Vista de Leads** (TanStack Table):

```
┌─────────────────────────────────────────────────────────┐
│  Leads (47)                    [+ Nuevo] [⊞] [≡]       │
├─────────────────────────────────────────────────────────┤
│  [Buscar...]              [Filtrar ▼] [Estado ▼]       │
├─────────────────────────────────────────────────────────┤
│  □  Nombre      │ Vehículo      │ Estado   │ Fecha     │
├─────────────────────────────────────────────────────────┤
│  □  Juan Pérez  │ Toyota Cor... │ 🟢 Nuevo │ Hace 2h   │
│  □  María López │ Honda Civi... │ 🟡 Cont. │ Hace 1d   │
│  □  Carlos R.   │ Ford F-150... │ 🔵 Cita  │ Hace 3d   │
└─────────────────────────────────────────────────────────┘
```

**Vista Kanban**:

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│  Nuevo   │Contactado│   Cita   │Negociando│ Vendido  │
│   (12)   │   (8)    │   (3)    │   (2)    │   (22)   │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │ ┌──────┐ │
│ │ Juan │ │ │María │ │ │Carlos│ │          │ │Pedro │ │
│ │Corolla│ │ │Civic │ │ │F-150 │ │          │ │Camry │ │
│ │ 2h   │ │ │ 1d   │ │ │ 3d   │ │          │ │ 7d   │ │
│ └──────┘ │ └──────┘ │ └──────┘ │          │ └──────┘ │
│ ┌──────┐ │          │          │          │          │
│ │ Ana  │ │          │          │          │          │
│ │Accord│ │          │          │          │          │
│ │ 3h   │ │          │          │          │          │
│ └──────┘ │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Tareas

- [ ] Frontend: Vista tabla con TanStack Table
- [ ] Frontend: Vista Kanban con dnd-kit
- [ ] Frontend: Toggle tabla/kanban
- [ ] Frontend: Filtros guardados (localStorage)
- [ ] Backend: Estados de lead (nuevo, contactado, cita, negociando, vendido, perdido)
- [ ] Backend: Actualizar estado de lead

---

## FASE 4: Pipelines ($49/mes) — ✅ COMPLETA (2026-10-07)

**Branch**: `feat/phase-4-pipelines`
**Duración**: 4-6 semanas
**Precio**: $49/mes
**Twenty concepts**: Pipelines, Activities

**Nota de implementación real**: "Pipelines" (stages de `Lead.status`,
máquina de estados) ya existía desde la Fase 2/3. Lo que esta fase cerró
fue específicamente **Activities**: `LeadActivity` (nota/llamada manual),
distinto de `LeadAuditLog` (que solo registra transiciones de estado
automáticas). El timeline de UI mergea ambas fuentes en un solo feed
cronológico (`LeadTimeline.tsx`), tal como muestra el mockup de abajo —
el drag&drop del Kanban que cambia estado ya estaba implementado con
`@dnd-kit/core` real en `pipeline/page.tsx`.

### Backend

```python
class LeadActivity(Base):
    id: Mapped[UUID]
    lead_id: Mapped[UUID]
    type: Mapped[str]  # nota | llamada | cita | stage_change
    content: Mapped[str]
    created_at: Mapped[datetime]
    created_by: Mapped[UUID]
```

### UX/UI Specs

**Detalle de Lead** con Timeline:

```
┌─────────────────────────────────────────────────────────┐
│  ← Leads          Juan Pérez            [Editar] [···] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📱 +58 412 123 4567        [WhatsApp] [Llamar] │   │
│  │  📧 juan@email.com                              │   │
│  │  🚗 Toyota Corolla 2022 - $25,000               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Estado: [Nuevo ▼] → [Contactado ▼] → [Cita ▼]         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ACTIVIDAD                    [+ Nota] [+ Cita]        │
├─────────────────────────────────────────────────────────┤
│  ○───────────────────────────────────────────────      │
│  │  📝 Nota - Hoy 10:30am                              │
│  │  Cliente interesado, pide fotos adicionales         │
│  │                                                      │
│  ○───────────────────────────────────────────────      │
│  │  📞 Llamada - Ayer 3:00pm                           │
│  │  Primera llamada, muy interesado                    │
│  │                                                      │
│  ○───────────────────────────────────────────────      │
│  │  🟢 Lead creado - 15 Jul 2026                       │
│  │  Desde página de producto                           │
└─────────────────────────────────────────────────────────┘
```

### Tareas

- [ ] Backend: Modelo `LeadActivity`
- [ ] Backend: CRUD de actividades
- [ ] Frontend: Detalle de lead con timeline
- [ ] Frontend: Agregar nota/llamada/cita
- [ ] Frontend: Drag & drop en kanban cambia estado
- [ ] Frontend: Notificaciones de recordatorio

---

## FASE 5: Workflows ($99/mes) — ✅ COMPLETA, in-app only (2026-10-07)

**Branch**: `feat/phase-5-workflows`
**Duración**: 6-8 semanas
**Precio**: $99/mes
**Twenty concepts**: Automations (hardcoded primero)

**Nota de implementación real**: Trigger 1 (lead sin actividad) implementado
como `NotifyStaleLeadsUseCase` + `notify_stale_leads_task.py` (Taskiq, cron
diario). Canal **in-app únicamente** — push y WhatsApp Business API/Twilio
quedaron deliberadamente diferidos: ninguno de los dos tiene infraestructura
en este proyecto hoy, y agregarla es una decisión de costo/infra que el
usuario debe tomar explícitamente, no algo para resolver en silencio.
Trigger 2 (nuevo lead → notificar) ya existía desde la Fase 2
(`CreateLeadUseCase` ya crea una `Notification` al asignar).

### Triggers Hardcodeados

```python
# ponytail: no workflow engine genérico todavía

# Trigger 1: Lead sin actividad en 3 días
async def check_stale_leads():
    """Cron job diario"""
    stale = await get_stale_leads(days=3)
    for lead in stale:
        await notify_dealer(lead, "Lead sin seguimiento")

# Trigger 2: Nuevo lead → notificar inmediatamente
async def on_lead_created(lead: Lead):
    await send_push_notification(lead.organization_id, f"Nuevo lead: {lead.name}")
    await send_whatsapp_notification(lead)

# ponytail: workflow engine genérico cuando tengamos 5+ triggers
```

### Tareas

- [ ] Backend: Cron job para leads sin actividad
- [ ] Backend: Notificación push al dealer
- [ ] Backend: Notificación WhatsApp (Twilio/WhatsApp Business API)
- [ ] Frontend: Panel de configuración de notificaciones
- [ ] Frontend: Historial de notificaciones enviadas

---

## Twenty CRM - Conceptos Robados

### Implementar

| Concepto      | Fase | Cómo                             |
| ------------- | ---- | -------------------------------- |
| Views         | 3    | TanStack Table + dnd-kit Kanban  |
| Pipelines     | 4    | Stages + Timeline de actividades |
| Automations   | 5    | Cron jobs + triggers hardcoded   |
| Custom Fields | 6+   | JSONB en modelos existentes      |

### Ignorar

| Concepto        | Por qué                     |
| --------------- | --------------------------- |
| GraphQL         | REST más simple             |
| Schema dinámico | JSONB suficiente            |
| Jotai/Linaria   | Ya tenemos Zustand/Tailwind |
| i18n            | Solo español por ahora      |
| Email sync      | No aplica                   |
| AI Agents       | FASE 6+                     |

---

## Archivos de Referencia (Twenty)

```
packages/twenty-server/src/
├── modules/
│   ├── opportunity/    # → Nuestro Lead
│   └── activity/       # → Nuestro LeadActivity

packages/twenty-front/src/
├── modules/
│   ├── views/          # → TanStack Table + Kanban
│   └── activities/     # → Timeline
```

---

## Siguiente Paso

```bash
git checkout feat/phase-1-mvp-whatsapp
```

Empezar con:

1. Endpoint público backend
2. Página `/p/[slug]` con Open Graph
3. Botón "Compartir por WhatsApp"
