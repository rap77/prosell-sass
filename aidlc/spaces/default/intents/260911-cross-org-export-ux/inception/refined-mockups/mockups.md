# Mockups (textuales) — 260911-cross-org-export-ux

Este intent no introduce pantallas nuevas — extiende 3 componentes ya
existentes y en producción: `OrganizationPicker.tsx` (header),
`ExportSummaryBanner` (dentro de `catalog/page.tsx`), y el flujo de
`window.prompt()` de export. Sin `rough-mockups` previos (scope
`classic`, sin Ideation) — mockups textuales derivados directo de
`stories.md`/`requirements.md`, per el carve-out ya documentado en el
stage file.

## M1 — Selector de organización (header), estado desplegado

Extiende `OrganizationPicker.tsx`. Cubre US1.1, US1.2, US2.1, US2.2
(el estado por defecto del trigger, "Mi Organización", es el que
representa el comportamiento de US2.2 — nunca resuelve a "todas" sin
selección explícita).

```
┌─────────────────────────────────────┐
│ [🏢] Mi Organización            [▾] │  ← trigger, sin cambios de forma
├─────────────────────────────────────┤
│  Mi organización                     │  ← siempre primera (organización propia)
│ ──────────────────────────────────── │  ← separador (Q1: destacada)
│  [▤] Todas las organizaciones        │  ← ícono distinto (capas/grid), SOLO si permiso ORG_ADMIN_VIEW_ALL
│ ──────────────────────────────────── │
│  🏢 Acme Motors            (12)      │  ← organización puntual, badge = product_count
│  🏢 DK Motors               (3)      │
│  🏢 MF Auto                 (7)      │
│  …                                    │  ← SOLO organizaciones con product_count > 0 (US1.2)
└─────────────────────────────────────┘
```

**Estados**:

- **Loading** (fetch de `useOrganizations()` en curso): skeleton de 3
  filas, mismo patrón de skeleton ya usado en el resto de la app.
- **Empty** (ninguna organización con `product_count > 0`, caso raro):
  "No hay organizaciones con catálogo" — mensaje inline, sin
  ilustración (menú compacto, no una pantalla completa).
- **Error** (fetch falla): mismo toast de error genérico ya usado por
  el mandate Q6 de manejo de errores centralizado.
- **Sin permiso** (Marcos, sin `ORG_ADMIN_VIEW_ALL`): el picker entero
  NO se renderiza (`!isAdmin` → `null`, comportamiento ya existente,
  sin cambios — AC2.1.2/AC3.3.1).

## M2 — Grilla de `/catalog`, filtrada por organización elegida

Extiende `catalog/page.tsx`. Cubre US3.1, US3.2, US3.3.

```
┌───────────────────────────────────────────────┐
│ Organización activa: Acme Motors    [Cambiar]  │  ← indicador contextual (nuevo, ver interaction-spec.md)
├───────────────────────────────────────────────┤
│  [Producto 1]  [Producto 2]  [Producto 3]      │  ← grilla ya existente, ahora filtrada por organization_id
│  [Producto 4]  [Producto 5]  …                 │
└───────────────────────────────────────────────┘
```

**Estados**:

- **Loading**: skeleton de grilla ya existente (`useInfiniteProducts`),
  sin cambios de forma.
- **Empty** (organización elegida sin productos, o "todas" sin ningún
  producto en la plataforma): mensaje ya existente de catálogo vacío,
  sin cambio de copy — este intent no introduce una ilustración nueva.
- **Error** (fetch de `useInfiniteProducts` falla, ej. sin conexión):
  manejo de error ya existente del hook — mismo mandate Q6 de manejo
  centralizado, sin UI nueva (ya cubierto en `interaction-spec.md`, sin
  reflejar acá era una omisión de este artefacto).
- **Todas las organizaciones**: la grilla muestra productos de
  cualquier organización sin filtro adicional (US3.2) — cada tarjeta
  de producto puede opcionalmente mostrar el nombre de organización
  (decisión de Functional Design, no bloqueante para este mockup).

## M3 — Banner de confirmación de export

Extiende `ExportSummaryBanner`. Cubre US5.1, y el badge cross-org ya
existente de `260911-export-org-selector`.

```
┌──────────────────────────────────────────────────────┐
│ [🏢 Exportando: Acme Motors]        Continuar Cancelar │  ← caso org puntual (ya existente)
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ [▤ TODAS LAS ORGANIZACIONES]                                  │
│ ⚠ Vas a exportar el catálogo de TODAS las organizaciones      │
│   (12 en total).                                              │
│                                       Continuar     Cancelar   │
└──────────────────────────────────────────────────────────────┘
```

**Estados**:

- **Default** (org propia, sin badge): sin cambios respecto a hoy.
- **Cross-org puntual**: badge existente, sin cambios (US5 no lo toca).
- **Todas las organizaciones** (NUEVO): badge distinto + línea de
  advertencia con el número N de organizaciones (AC5.1.1), mismo
  Continuar/Cancelar.
- **Loading durante el export "todas"** (Q2, NUEVO): el botón
  "Continuar" pasa a estado deshabilitado con spinner + texto
  "Exportando todas las organizaciones..." — distinto del spinner
  genérico ya usado para un export puntual.

## M4 — Secuencia de popups de export (`window.prompt()`)

Cubre US8, US9, y el popup de nombre de archivo ya existente. Orden:
archivo → carpeta base → grupos de Facebook (per nota de orden en
`stories.md`).

```
1. window.prompt("Nombre del archivo:", "catalogo-2026-09-11")        ← ya existente
   ↓ (si no cancela)
2. window.prompt("Carpeta base de imágenes:",
     "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/")            ← NUEVO (US8.1)
   ↓ (si no cancela)
3. window.prompt("Grupos de Facebook (separados por coma):", "1,2,3") ← NUEVO (US9.1)
   ↓ (si no cancela)
   → dispara el export con los 3 valores confirmados
```

Cancelar cualquiera de los 3 popups aborta el flujo completo sin
disparar el export (AC8.1.2, AC9.1.2, AC9.1.3).

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-12T09:33:10Z
**Iteration:** 1

### Correcciones aplicadas antes de este veredicto

| #   | Ubicación                     | Corrección mecánica                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `mockups.md`, M2 § Estados    | Faltaba el estado **Error** de la grilla de `/catalog` (fetch de `useInfiniteProducts` falla) — `interaction-spec.md` ya lo documenta para `CatalogGrid` (`error \| Manejo de error ya existente del hook`), pero `mockups.md` solo listaba Loading/Empty/"Todas las organizaciones", dejando el artefacto primario inconsistente con la spec de interacción para ese mismo componente. Agregado el bullet de Error citando el mismo mecanismo ya existente (mandate Q6), sin introducir UI nueva. |
| 2   | `mockups.md`, M1 § encabezado | La línea "Cubre" de M1 listaba US1.1/US1.2/US2.1 pero omitía US2.2 (comportamiento por defecto — nunca resuelve a "todas" sin selección explícita), pese a que el propio mockup ya representa ese comportamiento (el trigger por defecto muestra "Mi Organización", "sin cambios de forma"). Agregada la referencia explícita a US2.2 con la aclaración de qué parte del mockup lo cubre.                                                                                                          |

Ninguna corrección cambia el contenido visual/de interacción diseñado — son correcciones de completitud de trazabilidad y de paridad entre `mockups.md` e `interaction-spec.md`.

### Verificación Q1/Q2/Q3 across los 4 artefactos

- **Q1 (opción "todas" destacada)**: consistente en los 4 archivos — `mockups.md` M1 (separador + ícono distinto + posición fija tras "Mi organización"), `interaction-spec.md` (aria-label descriptivo, separador real vía `<hr>`/borde, no solo color), `design-system-mapping.md` (reutiliza patrón de separador + ícono `Layers`/`Grid` de la librería ya instalada), `accessibility-checklist.md` (Perceivable: "no se distingue SOLO por color"). Sin contradicciones.
- **Q2 (estado de carga distinguible para "todas")**: consistente — `mockups.md` M3 ("Loading durante el export 'todas'", spinner + texto "Exportando todas las organizaciones..."), `interaction-spec.md` (estado `exporting-all` con el mismo texto, distinto de `exporting-single`), `accessibility-checklist.md` (`aria-live="assertive"` específico para `exporting-all`). Sin contradicciones.
- **Q3 (baseline WCAG AA + breakpoints existentes)**: consistente — `accessibility-checklist.md` declara "WCAG 2.1 AA" como nivel objetivo explícito; los 3 componentes en `interaction-spec.md` declaran "Sin cambios" en su tabla de Responsive Behaviour para mobile/tablet/desktop, sin breakpoint nuevo introducido en ningún artefacto.

### Verificación de los 5 estados obligatorios de wireframing (`wireframing-guide.md`)

| Componente               | Empty                                                               | Loading                                 | Success                                 | Error                                                                                                                                                                                                                                                                                                                                                                                                                | Partial/edge                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------- | --------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OrganizationPicker (M1)  | ✅ ("No hay organizaciones con catálogo")                           | ✅ (skeleton 3 filas)                   | ✅ (trigger default + lista desplegada) | ✅ (toast genérico Q6)                                                                                                                                                                                                                                                                                                                                                                                               | Parcial — cubre el caso "sin permiso" (hidden) como variante de acceso, pero no anota explícitamente casos de volumen (nombre de organización muy largo, lista con muchas organizaciones); no bloqueante — reutiliza el mismo componente ya en producción sin cambio de contenedor/scroll. |
| CatalogGrid (M2)         | ✅ (mensaje ya existente)                                           | ✅ (skeleton ya existente)              | ✅ (grilla filtrada / "todas")          | ✅ (agregado en esta revisión, ver corrección #1)                                                                                                                                                                                                                                                                                                                                                                    | El comportamiento de paginación/orden en modo "todas" queda explícitamente diferido a Functional Design (`requirements.md` FR3.2, Open Question #3) — correctamente no resuelto acá, no es un gap de este artefacto.                                                                       |
| ExportSummaryBanner (M3) | N/A (banner de confirmación, no tiene estado de "sin datos" propio) | ✅ (`exporting-all`/`exporting-single`) | ✅ (own-org/cross-org/all-orgs)         | No hay un estado de banner dedicado para 413/404/error de red durante el export — se apoya en el mecanismo de toast ya existente (mismo patrón ya usado hoy para el export de una sola organización, confirmado en `project.md` como precedente de `260903-catalog-client-export`). Aceptable: no es una regresión de cobertura, es reuso explícito de un mecanismo ya probado, no una omisión nueva de este intent. | N/A                                                                                                                                                                                                                                                                                        |
| Secuencia de popups (M4) | N/A (`window.prompt()` nativo, sin estado de datos)                 | N/A (síncrono, sin fetch)               | ✅ (valor confirmado)                   | N/A — cancelación ya cubre el único "camino alternativo" posible de un prompt nativo                                                                                                                                                                                                                                                                                                                                 | ✅ (AC9.1.3, cancelación del segundo popup tras confirmar el primero)                                                                                                                                                                                                                      |

### Verificación de consistencia con decisiones cerradas de `stories.md`/`requirements.md`

- El sentinel de organización (`viewingOrgId: string \| "ALL_ORGS" \| null`) es el mismo campo ya existente, consistente con FR2.1 — ningún mockup introduce un campo/modo separado.
- El orden de popups (archivo → carpeta base → grupos de Facebook) es idéntico en `mockups.md` M4, `interaction-spec.md`, y la nota de orden de `stories.md` § US8 — sin contradicción.
- El texto de ejemplo de AC5.1.1 ("Vas a exportar el catálogo de TODAS las organizaciones (N en total)") se refleja literalmente en M3, con "12" como valor de ejemplo — consistente, no contradice que N sea dinámico.
- FR5.1 descarta explícitamente palabra de confirmación tipeada (Q6 de `requirements.md`) — ningún mockup introduce ese mecanismo; M3 mantiene Continuar/Cancelar.
- El caso de `organizationId` "ausente" para el modo "todas" en `interaction-spec.md` (CatalogGrid Props) señala explícitamente que el backend necesita distinguir ausencia+flag — correctamente diferido a Functional Design, no resuelto por adelantado en este artefacto, consistente con `requirements.md` FR3.2 (Open Question #3).

### Cobertura de historias UI-relevantes

US1.1/US1.2 → M1. US2.1/US2.2 → M1 (corrección #2). US3.1/US3.2/US3.3 → M2. US4.1 (single download) y US4.4 (Marcos sin permiso) → cubiertas implícitamente por el flujo M3+M4 y el estado "hidden" de M1/AC2.1.2 respectivamente; no requieren un mockup dedicado porque no introducen una superficie visual nueva. US4.5 (universo vacío en export "todas") reutiliza el mismo mecanismo de toast 404 ya usado hoy para un export puntual — sin UI nueva, consistente con el precedente ya documentado. US5.1 → M3. US8.1/US8.2/US9.1/US9.2 → M4. US4.2/US4.3/US6.1/US7.1–US7.6 son backend-only (sin superficie de UI propia) y correctamente no tienen mockup — consistente con el alcance de esta etapa.

### Consistencia de `accessibility-checklist.md` contra `accessibility-wcag.md`

La estructura POUR (Perceivable/Operable/Understandable/Robust) del checklist mapea 1:1 contra las 4 secciones de la guía. Verificado ítem por ítem: no depender solo de color (guía § Perceivable → Color Contrast), navegación por teclado sin trampas de foco (guía § Operable → Keyboard Navigation, Modals), `aria-live` para contenido dinámico (guía § ARIA → `aria-live="polite"`), `role="alert"` para el estado de mayor prioridad (guía § ARIA Landmarks/roles), touch targets ya dimensionados (heredado, sin cambio). Ningún ítem del checklist contradice la guía. La limitación explícita de `window.prompt()` (fuera de alcance del checklist, documentada como tal) es consistente con que la guía no cubre diálogos nativos del navegador fuera del control de la aplicación.

### Summary

El artefacto llega sólido: las decisiones Q1/Q2/Q3 están reflejadas de forma consistente en los 4 documentos, los 5 estados obligatorios de wireframing están cubiertos para los 3 componentes con estado propio (con reuso explícito y justificado del mecanismo de toast existente para el caso de error de export, y con la paginación de "todas" correctamente diferida a Functional Design), ninguna decisión cerrada de `stories.md`/`requirements.md` es contradicha, la cobertura de historias UI-relevantes es completa, y `accessibility-checklist.md` es consistente con la guía de referencia. Corregí dos omisiones mecánicas antes de este veredicto: el estado Error faltante en M2 (paridad con `interaction-spec.md`) y la referencia faltante a US2.2 en M1.
