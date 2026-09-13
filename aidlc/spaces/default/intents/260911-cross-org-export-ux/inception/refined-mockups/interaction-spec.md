# Interaction Specification — 260911-cross-org-export-ux

Formato por componente per `.claude/knowledge/aidlc-design-agent/component-spec-template.md`.
Fuente: `stories.md`, `requirements.md`, `mockups.md`.

---

## OrganizationPicker (extensión)

| Field       | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| Component   | OrganizationPicker (extensión)                                                     |
| Description | Selector de organización en el header, con nueva opción "Todas las organizaciones" |
| Category    | navigation                                                                         |

### States

| State   | Description                                                                | Trigger                                      |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| default | Muestra "Mi Organización" o el nombre de la organización activa            | page load / sin selección                    |
| open    | Lista desplegada con separador + opción "todas" + organizaciones puntuales | click en trigger                             |
| loading | Skeleton de 3 filas mientras `useOrganizations()` resuelve                 | fetch en curso                               |
| empty   | "No hay organizaciones con catálogo"                                       | ninguna organización con `product_count > 0` |
| error   | Toast de error genérico (mandate Q6)                                       | fetch falla                                  |
| hidden  | Componente no se renderiza                                                 | `!isAdmin` (Marcos)                          |

### Props / Inputs

| Prop         | Type                                          | Required | Default | Description                                                                                                                |
| ------------ | --------------------------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| viewingOrgId | string \| "ALL_ORGS" \| null                  | no       | null    | Estado activo: null = propia, string = una org puntual, "ALL_ORGS" = todas (sentinel, ver Assumption de Functional Design) |
| onSelect     | (value: string \| "ALL_ORGS" \| null) => void | sí       | —       | Callback al elegir una opción                                                                                              |

### Responsive Behaviour

| Breakpoint          | Behaviour                                                                      |
| ------------------- | ------------------------------------------------------------------------------ |
| mobile (<768px)     | Mismo comportamiento ya existente del picker — sin cambios de este intent (Q3) |
| tablet (768–1024px) | Sin cambios                                                                    |
| desktop (>1024px)   | Sin cambios (comportamiento default ya existente)                              |

### Accessibility

| Requirement          | Implementation                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA role            | `listbox`/`option` (o el rol nativo ya usado por el componente existente — sin cambio)                                                                                  |
| Keyboard interaction | Arrow keys para navegar opciones, Enter para seleccionar, Escape para cerrar — mismo patrón ya existente                                                                |
| Label / aria-label   | La opción "Todas las organizaciones" lleva `aria-label="Ver el catálogo de todas las organizaciones"` (más descriptivo que el label visible, per WCAG "Understandable") |
| Contrast ratio       | WCAG AA (4.5:1 texto, 3:1 componentes UI) — el separador visual (Q1) no depende solo de color, usa un `<hr>`/borde real, no solo un cambio de fondo                     |
| Screen reader        | Anuncia "Todas las organizaciones, opción X de N" al navegar con teclado — mismo patrón que las demás opciones                                                          |
| Focus management     | Foco vuelve al trigger al cerrar (con o sin selección) — mismo patrón ya existente                                                                                      |

### Usage Example

```
<OrganizationPicker
  viewingOrgId={viewingOrgId}
  onSelect={setViewingOrgId}
/>
```

---

## CatalogGrid (extensión de `catalog/page.tsx`)

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Component   | CatalogGrid (extensión)                                              |
| Description | Grilla de productos de `/catalog`, ahora filtrada por `viewingOrgId` |
| Category    | display                                                              |

### States

| State    | Description                                                 | Trigger                                            |
| -------- | ----------------------------------------------------------- | -------------------------------------------------- |
| default  | Grilla filtrada por la organización propia (sin selección)  | page load                                          |
| filtered | Grilla filtrada por la organización elegida en el picker    | `viewingOrgId` = string puntual                    |
| all-orgs | Grilla sin filtro de organización                           | `viewingOrgId` = "ALL_ORGS"                        |
| loading  | Skeleton de grilla ya existente                             | fetch en curso (refetch al cambiar `viewingOrgId`) |
| empty    | Mensaje ya existente de catálogo vacío                      | 0 productos para el filtro activo                  |
| error    | Manejo de error ya existente del hook `useInfiniteProducts` | fetch falla                                        |

### Props / Inputs

| Prop           | Type                | Required | Default                     | Description                                                                                                               |
| -------------- | ------------------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| organizationId | string \| undefined | no       | undefined (mi organización) | Deriva de `viewingOrgId`; ausente cuando es "ALL_ORGS" (backend interpreta ausencia+flag distinto, ver Functional Design) |

### Responsive Behaviour

| Breakpoint                | Behaviour                                                                   |
| ------------------------- | --------------------------------------------------------------------------- |
| mobile / tablet / desktop | Sin cambios — mismo layout de grilla ya existente en los 3 breakpoints (Q3) |

### Accessibility

| Requirement          | Implementation                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA role            | Sin cambios respecto al componente existente                                                                                                |
| Keyboard interaction | Sin cambios                                                                                                                                 |
| Label / aria-label   | El indicador "Organización activa: X" (M2) usa `aria-live="polite"` para anunciar el cambio de filtro tras elegir una organización distinta |
| Contrast ratio       | WCAG AA, sin cambios respecto al componente existente                                                                                       |
| Screen reader        | Anuncia el cambio de organización activa vía `aria-live`, no solo visualmente                                                               |
| Focus management     | El foco permanece en el picker tras el refetch — no salta a la grilla automáticamente                                                       |

### Usage Example

```
<CatalogGrid organizationId={apiFilters.organizationId} />
```

---

## ExportSummaryBanner (extensión)

| Field       | Value                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| Component   | ExportSummaryBanner (extensión)                                                             |
| Description | Banner de confirmación de export, con advertencia reforzada para "todas las organizaciones" |
| Category    | feedback                                                                                    |

### States

| State            | Description                                                                                     | Trigger                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| own-org          | Sin badge, comportamiento ya existente                                                          | export de la organización propia                          |
| cross-org        | Badge existente + Continuar/Cancelar                                                            | export de una organización ajena puntual                  |
| all-orgs         | Badge distinto + texto de advertencia con N (AC5.1.1)                                           | export "todas las organizaciones"                         |
| exporting-all    | Botón "Continuar" deshabilitado + spinner + texto "Exportando todas las organizaciones..." (Q2) | click en "Continuar" durante export "todas"               |
| exporting-single | Spinner genérico ya existente, sin texto especial                                               | click en "Continuar" durante export puntual (sin cambios) |

### Props / Inputs

| Prop         | Type                                                                                                           | Required | Default         | Description                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| organization | `{kind: "own"} \| {kind: "loading"} \| {kind: "cross-org", name: string} \| {kind: "all-orgs", count: number}` | sí       | `{kind: "own"}` | Tipo discriminado ya establecido en `catalog/page.tsx` (`ExportOrganization`), extendido con la variante `all-orgs` |
| isExporting  | boolean                                                                                                        | no       | false           | Controla el estado de carga distinguible (Q2)                                                                       |

### Responsive Behaviour

| Breakpoint                | Behaviour                                         |
| ------------------------- | ------------------------------------------------- |
| mobile / tablet / desktop | Sin cambios — mismo layout de banner ya existente |

### Accessibility

| Requirement          | Implementation                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA role            | `role="alert"` para la advertencia de "todas" — mayor prioridad de anuncio que el badge cross-org existente (que puede usar `status`)  |
| Keyboard interaction | Continuar/Cancelar accesibles por Tab + Enter, sin cambios                                                                             |
| Label / aria-label   | El texto de advertencia (AC5.1.1) es el propio contenido anunciado — no requiere `aria-label` adicional                                |
| Contrast ratio       | WCAG AA — el ícono de advertencia (⚠) va acompañado de texto, nunca solo color                                                         |
| Screen reader        | `aria-live="assertive"` para el estado `exporting-all` (cambio de estado importante durante una operación de mayor radio de explosión) |
| Focus management     | El foco permanece en el banner mientras `isExporting=true` (botón deshabilitado, no removido del DOM)                                  |

### Usage Example

```
<ExportSummaryBanner
  organization={{ kind: "all-orgs", count: 12 }}
  isExporting={isExporting}
/>
```

---

## Secuencia de popups (`window.prompt()`) — sin componente nuevo

No aplica el template de componente (son llamadas nativas del
navegador, no componentes React) — especificación de la secuencia:

1. **Orden fijo**: nombre de archivo (existente) → carpeta base (US8,
   NUEVO) → grupos de Facebook (US9, NUEVO).
2. **Cancelación**: cualquier `window.prompt()` que retorne `null`
   aborta el flujo completo inmediatamente — ningún popup posterior se
   dispara, y el export no se ejecuta (AC8.1.2, AC9.1.2, AC9.1.3).
3. **Accesibilidad**: `window.prompt()` nativo ya hereda foco/anuncio
   de screen reader del navegador — sin anotación adicional posible ni
   necesaria (limitación ya aceptada por el equipo en Practices
   Discovery/design's contribution, no un requisito de este intent).
