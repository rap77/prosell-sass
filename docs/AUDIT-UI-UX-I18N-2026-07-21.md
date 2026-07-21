# Audit UI/UX + i18n — ProSell SaaS

**Fecha**: 2026-07-21
**Objetivo**: Evaluar debilidades UI/UX + plan completo i18n (EN/ES) sin hardcoding

---

## 📊 Estado Actual

### ✅ Fortalezas

**i18n Infrastructure (Parcial)**

- ✅ `next-intl` 4.13.1 instalado
- ✅ Configuración base: `en` (default) + `es`
- ✅ `LocaleSwitcher` component funcional
- ✅ Archivos de traducción estructurados:
  - `messages/en.json`: 235 líneas (common, nav, status, auth, validation, landing)
  - `messages/es.json`: 235 líneas (traducciones voseo argentino 🇦🇷)
- ✅ Landing page parcialmente traducida (hero + nav usan `useTranslations`)

**UI Components (shadcn/ui base)**

- ✅ 24 componentes UI reutilizables (`/components/ui/`)
- ✅ Tailwind 4 configurado
- ✅ Design tokens vía CSS variables (`--ps-*`)
- ✅ Componentes base: AlertDialog, Card, Select, Dropdown, Checkbox, Dialog, Sonner

**Design System Foundations**

- ✅ Consistent spacing (Tailwind utilities)
- ✅ Color system via CSS variables
- ✅ Typography scale defined

---

## ❌ Debilidades Críticas

### 1. **i18n Incompleto (95% Hardcoded)**

**Problema**: Solo landing page usa traducciones. Todo admin/seller/CRM hardcoded.

**Evidencia**:

```bash
# Solo 2 archivos usan useTranslations:
- apps/web/src/components/landing/landing-hero.tsx
- apps/web/src/components/landing/landing-nav.tsx

# 125+ archivos tienen hardcoded strings en español/inglés mezclados
```

**Impacto**:

- Usuario latino ve mezcla español/inglés en plataforma
- Imposible expandir a otros mercados
- Violación del requirement "NO hardcoding"

**Áreas afectadas**:

- ❌ Admin panel completo (`/admin/*`)
- ❌ Seller dashboard (`/seller/*`)
- ❌ Auth flows (login, register, 2FA, forgot password)
- ❌ Forms (UnifiedProductForm, CategorySelector, etc.)
- ❌ CRM (leads, pipeline, appointments)
- ❌ Error messages (frontend + backend)
- ❌ Validation messages (Zod schemas)
- ❌ Toast notifications (Sonner)
- ❌ Emails (backend notifications)

---

### 2. **Mensajes de Error Backend No Traducidos**

**Problema**: FastAPI retorna errores en inglés hardcoded.

**Ejemplos**:

```python
# apps/api/src/prosell/domain/exceptions/lead_exceptions.py
raise LeadStateTransitionException(
    current_status=self.status.value,
    target_status=new_status.value,  # Hardcoded "Invalid transition from X to Y"
)
```

**Solución requerida**:

- Backend debe retornar error codes (ej: `LEAD_INVALID_TRANSITION`)
- Frontend mapea codes a traducciones
- O backend usa i18n library (Babel para Python)

---

### 3. **Validaciones Hardcoded en Zod Schemas**

**Problema**: Mensajes de validación en inglés sin next-intl.

**Ejemplo**:

```typescript
// apps/web/src/lib/api/schemas/leads.ts
z.string().min(1, "Name is required"); // ❌ Hardcoded
z.string().email("Invalid email"); // ❌ Hardcoded
```

**Solución requerida**:

- Usar next-intl en Zod schemas vía custom error map
- O centralizar validaciones en `messages/*.json`

---

### 4. **Inconsistencias de Diseño (UX Issues)**

#### 4.1. **Navigation Inconsistency**

- Landing usa `landing-nav.tsx` (sticky header)
- Admin usa `Sidebar.tsx` (collapsible)
- Seller usa `Sidebar.tsx` + `Header.tsx`
- ❌ No hay mobile menu unified

**Recomendación**: Unificar nav pattern o documentar cuando usar cada uno.

#### 4.2. **Loading States Inconsistentes**

- Algunos usan `FullPageLoader`
- Otros usan Suspense
- Otros usan skeletons (`DataGridSkeleton`)
- ❌ No hay guía de cuándo usar cada uno

**Recomendación**: Crear loading state design guideline.

#### 4.3. **Empty States Faltantes**

- Catálogo vacío muestra tabla vacía (no friendly message)
- Pipeline vacío no tiene ilustración
- Leads sin datos muestra "No results"

**Recomendación**: Crear `<EmptyState>` component reutilizable con ilustración + CTA.

#### 4.4. **Error Boundaries Inconsistentes**

- `CatalogErrorBoundary` existe
- Resto de rutas no tienen error boundary
- Global `error.tsx` y `global-error.tsx` existen pero no customizados

**Recomendación**: Wrapper global o boundary por feature.

#### 4.5. **Form Validation UX**

- Validación inline (react-hook-form) funciona
- ❌ No hay field-level error icons
- ❌ No hay success states (checkmarks)
- ❌ Submit button disabled pero sin loading spinner

**Recomendación**: Agregar visual feedback states.

---

### 5. **Accessibility Gaps (a11y)**

❌ **Missing**:

- Skip to content link
- Focus visible styles inconsistentes
- ARIA labels en iconos sin texto
- Keyboard navigation en Kanban drag-and-drop
- Screen reader announcements en toasts

**Recomendación**: Audit a11y completo con axe DevTools.

---

### 6. **Mobile Responsiveness Issues**

**Áreas no testeadas**:

- Admin tables no tienen horizontal scroll
- Kanban board no funciona touch
- Forms largos (UnifiedProductForm) no optimizados mobile
- Sidebar no colapsa en mobile

**Recomendación**: Mobile-first audit Sprint D.

---

### 7. **Performance Gaps**

**Observaciones**:

- ✅ Image optimization configurado (next/image)
- ⚠️ No hay lazy loading de routes pesadas
- ⚠️ Suspense boundaries mínimos
- ❌ No hay code splitting manual en components grandes

**Recomendación**: React 19 Server Components + lazy() en client components pesados.

---

## 🎯 Plan i18n Completo — Sin Hardcoding

### Objetivo

- **100% traducido**: EN (primario) + ES (secundario)
- **0 hardcoding**: Todos los strings vía `useTranslations()`
- **Componentes reutilizables**: `<Trans>`, `<LocaleSwitcher>`, error mappers
- **UX excelente**: Locale switcher visible, traducciones naturales

---

### Stack i18n (Ya instalado)

```json
{
  "next-intl": "^4.13.1" // ✅ Instalado
}
```

**Por qué next-intl?**

- ✅ Next.js 15+ App Router nativo
- ✅ Server Components support
- ✅ Type-safe translations
- ✅ Nested keys (ej: `common.save`, `validation.required`)
- ✅ Interpolation (`{count}`, `{name}`)
- ✅ Plurals (`{count, plural, ...}`)

**Alternativas descartadas**:

- ❌ react-i18next: No optimizado para App Router
- ❌ lingui: Requiere babel, no compatible Turbopack

---

### Arquitectura Propuesta

```
apps/web/
├── messages/
│   ├── en.json          # ✅ Existe (235 líneas)
│   ├── es.json          # ✅ Existe (235 líneas)
│   └── [EXPANDIR]
│       ├── en/
│       │   ├── common.json       # Botones, acciones comunes
│       │   ├── nav.json          # Navegación
│       │   ├── auth.json         # Login, registro, 2FA
│       │   ├── validation.json   # Mensajes de validación
│       │   ├── errors.json       # Error codes del backend
│       │   ├── admin.json        # Admin panel
│       │   ├── seller.json       # Seller dashboard
│       │   ├── crm.json          # Leads, pipeline, appointments
│       │   ├── catalog.json      # Productos, categorías
│       │   ├── publisher.json    # Publicaciones FB
│       │   └── landing.json      # Landing page (ya existe)
│       └── es/
│           └── [misma estructura]
│
├── src/i18n/
│   ├── config.ts             # ✅ Existe
│   ├── request.ts            # ✅ Existe
│   └── [AGREGAR]
│       ├── errorMap.ts       # Backend error codes → traducciones
│       ├── zodErrorMap.ts    # Zod custom error map
│       └── utils.ts          # Helpers (formatDate, formatCurrency)
│
└── src/components/
    ├── i18n/
    │   ├── LocaleSwitcher.tsx   # ✅ Existe
    │   └── [AGREGAR]
    │       ├── Trans.tsx        # Rich text interpolation
    │       └── ClientProvider.tsx  # Client-side i18n wrapper
    └── ui/
        └── [ACTUALIZAR todos con useTranslations()]
```

---

### Fases de Implementación

#### **FASE i18n-1: Infraestructura** (2 días)

**Tareas**:

1. **Expandir messages/\*.json**
   - Split en archivos por namespace (common, auth, admin, etc.)
   - O mantener monolítico pero agregar secciones faltantes

2. **Error mapping backend → frontend**

   ```typescript
   // src/i18n/errorMap.ts
   export const errorCodeMap: Record<string, string> = {
     LEAD_INVALID_TRANSITION: "errors.lead.invalidTransition",
     PRODUCT_NOT_FOUND: "errors.product.notFound",
     // ...
   };
   ```

3. **Zod error map**

   ```typescript
   // src/i18n/zodErrorMap.ts
   import { makeZodI18nMap } from "zod-i18n-map";
   import { useTranslations } from "next-intl";

   export function useZodErrorMap() {
     const t = useTranslations("validation");
     return makeZodI18nMap({ t });
   }
   ```

4. **Trans component para rich text**
   ```tsx
   // src/components/i18n/Trans.tsx
   import { useTranslations } from "next-intl";

   export function Trans({
     id,
     values,
   }: {
     id: string;
     values?: Record<string, string | number>;
   }) {
     const t = useTranslations();
     return <>{t.rich(id, values)}</>;
   }
   ```

**Acceptance Criteria**:

- [ ] Archivos de mensajes completos (EN + ES)
- [ ] Error map backend implementado
- [ ] Zod error map configurado
- [ ] Trans component funcional

---

#### **FASE i18n-2: Auth Flows** (1 día)

**Componentes a migrar**:

- `LoginPageContent.tsx`
- `RegisterPageContent.tsx`
- `ForgotPasswordPageContent.tsx`
- `ResetPasswordPageContent.tsx`
- `Setup2FAPageContent.tsx`
- `VerifyEmailPageContent.tsx`
- `TwoFactorInput.tsx`
- `AuthShell.tsx`

**Patrón**:

```tsx
// ANTES
<h1>Log in to your account</h1>

// DESPUÉS
const t = useTranslations('auth')
<h1>{t('login')}</h1>
```

**Acceptance Criteria**:

- [ ] Auth flows 100% traducidos
- [ ] Errores de validación traducidos
- [ ] Emails de verificación/reset traducidos (backend)

---

#### **FASE i18n-3: Admin Panel** (2 días)

**Páginas**:

- `/admin/dashboard`
- `/admin/organizations/*`
- `/admin/categories`
- `/admin/import-client-csv`

**Componentes**:

- `OrganizationFormFields`
- `CategoryFormModal`
- `BulkImportClientCSV`
- `BrokerManager`

**Acceptance Criteria**:

- [ ] Admin panel 100% traducido
- [ ] Tables headers traducidos
- [ ] Form labels traducidos
- [ ] Toasts traducidos

---

#### **FASE i18n-4: Seller Dashboard** (2 días)

**Páginas**:

- `/seller/catalog/*`
- `/seller/products`
- `/seller/publications`
- `/seller/categories/*`
- `/seller/analytics`
- `/seller/settings/*`

**Componentes**:

- `UnifiedProductForm`
- `CategorySelector`
- `PublishForm`
- `DataGrid`
- `StatusBadge`

**Acceptance Criteria**:

- [ ] Seller dashboard 100% traducido
- [ ] Form validations traducidas
- [ ] Status badges traducidos

---

#### **FASE i18n-5: CRM** (1.5 días)

**Páginas**:

- `/seller/pipeline`
- `/vendedor/leads/*`

**Componentes**:

- `KanbanBoard`
- `LeadCard`
- `TeamLeadList`
- `LeadAuditTrail`
- `AppointmentForm`

**Acceptance Criteria**:

- [ ] CRM 100% traducido
- [ ] Timeline events traducidos
- [ ] Kanban columns traducidos

---

#### **FASE i18n-6: Public Pages** (1 día)

**Páginas**:

- `/` (landing - ya parcialmente hecho)
- `/p/[slug]` (producto público)
- `/privacy`
- `/terms`

**Acceptance Criteria**:

- [ ] Landing 100% traducido
- [ ] Producto público traducido
- [ ] Legal pages traducidos

---

#### **FASE i18n-7: Backend Errors + Emails** (1 día)

**Backend**:

1. **Opción A (Recomendada)**: Error codes

   ```python
   # apps/api/src/prosell/domain/exceptions/base.py
   class DomainException(Exception):
       error_code: str

   # FastAPI middleware retorna { "error_code": "LEAD_INVALID_TRANSITION" }
   # Frontend mapea a traducción
   ```

2. **Opción B**: Babel i18n Python
   ```python
   from flask_babel import _
   raise Exception(_("lead.invalidTransition"))
   ```

**Emails**:

- Templates Jinja2 con `{% trans %}` blocks
- O HTML templates con placeholders

**Acceptance Criteria**:

- [ ] Backend retorna error codes
- [ ] Emails soportan EN/ES
- [ ] Frontend mapea codes a traducciones

---

### Testing i18n

**Checklist**:

- [ ] Switcher visible en todas las páginas
- [ ] Cambio de idioma persiste (cookie)
- [ ] Página se refresca correctamente
- [ ] Plurals funcionan (`{count, plural, one {} other {}}`)
- [ ] Interpolaciones funcionan (`{name}`, `{price}`)
- [ ] Fallback a EN si clave faltante
- [ ] No hay mezcla de idiomas en una vista
- [ ] Mobile responsiveness del switcher

---

## 📋 Resumen Esfuerzo i18n

| Fase                     | Esfuerzo                   | Prioridad |
| ------------------------ | -------------------------- | --------- |
| i18n-1: Infraestructura  | 2 días                     | 🔴 P0     |
| i18n-2: Auth Flows       | 1 día                      | 🔴 P0     |
| i18n-3: Admin Panel      | 2 días                     | 🟡 P1     |
| i18n-4: Seller Dashboard | 2 días                     | 🟡 P1     |
| i18n-5: CRM              | 1.5 días                   | 🟡 P1     |
| i18n-6: Public Pages     | 1 día                      | 🟡 P1     |
| i18n-7: Backend + Emails | 1 día                      | 🟡 P1     |
| **TOTAL**                | **10.5 días (~2 semanas)** |           |

**Investment**: ~$800-$1,200 (2 semanas dev time)

---

## 🎨 Mejoras UX Recomendadas (Post-i18n)

### Sprint UX-1: Navigation & Loading (2 días)

- [ ] Unificar mobile menu
- [ ] Loading state guidelines
- [ ] Skeleton screens donde faltan

### Sprint UX-2: Empty States (1 día)

- [ ] `<EmptyState>` component
- [ ] Ilustraciones para catálogo, pipeline, leads vacíos

### Sprint UX-3: Form UX (1 día)

- [ ] Success states (checkmarks)
- [ ] Error icons
- [ ] Loading spinners en submit buttons

### Sprint UX-4: Accessibility (2 días)

- [ ] Skip to content
- [ ] Focus visible styles
- [ ] ARIA labels
- [ ] Keyboard nav audit

### Sprint UX-5: Mobile Optimization (3 días)

- [ ] Admin tables responsive
- [ ] Kanban touch gestures
- [ ] Forms mobile-optimized

**TOTAL UX**: 9 días (~2 semanas)

---

## 🚀 Integración en Roadmap v4.0

### Propuesta: Sprint i18n entre Sprint C y D

```
Sprint A (Ago): Facebook Automation Core
Sprint B (Sep): Facebook Automation Intelligence
Sprint C (Oct): Production-Ready

>>> Sprint i18n (Nov semana 1-2): i18n Completo <<<

Sprint D (Nov semana 3-4): CRM Básico Fase 3
Sprint E (Dic): CRM Intermedio Fase 4
Sprint F (Q1 2027): CRM Avanzado Fase 5 (opcional)
Sprint G (Q2 2027): Wallet + Monetización
```

**Alternativa**: Parallelize i18n con Sprint A-C

- i18n-1 + i18n-2 (Auth) durante Sprint A
- i18n-3 + i18n-4 (Admin/Seller) durante Sprint B
- i18n-5 + i18n-6 + i18n-7 durante Sprint C

**Ventaja parallelize**: CRM Sprint D ya tiene i18n listo
**Desventaja**: Más context switching, posible merge conflicts

---

## ✅ Acceptance Criteria Globales

- [ ] 100% de strings traducidos (EN + ES)
- [ ] 0 hardcoded text en componentes
- [ ] LocaleSwitcher visible en header
- [ ] Cambio de idioma persiste
- [ ] Backend errors mapeados
- [ ] Emails soportan ambos idiomas
- [ ] Tests E2E pasan en ambos locales
- [ ] Mobile responsiveness OK
- [ ] a11y básico (ARIA labels, focus)

---

## 📚 Referencias

- [next-intl docs](https://next-intl-docs.vercel.app/)
- [Zod i18n map](https://github.com/aiji42/zod-i18n)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
