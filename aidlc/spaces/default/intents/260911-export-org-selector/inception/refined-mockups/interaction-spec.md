# Interaction Specification — 260911-export-org-selector

Formato: `.claude/knowledge/aidlc-design-agent/component-spec-template.md`.
Trazan a `stories.md` (AC1.1.5, AC1.1.6, AC2.1.1) y `requirements.md`
(FR1.3, FR3.1).

## Componente modificado: `ExportSummaryBanner`

| Field       | Value                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Component   | ExportSummaryBanner (existente, modificado)                                                                         |
| Description | Banner de confirmación antes de exportar el catálogo; agrega un badge de organización cuando el export es cross-org |
| Category    | feedback                                                                                                            |

### States

| State                                 | Description                                                                            | Trigger                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| default (propia org)                  | Contenido actual, sin badge                                                            | `viewingOrgId` no seteado                                                                       |
| loading (cross-org, nombre pendiente) | Contenido actual + badge en estado skeleton/placeholder (NO el badge vacío ni ausente) | `viewingOrgId` apunta a otra organización Y `useOrganizations()` todavía no resolvió ese nombre |
| default (cross-org)                   | Contenido actual + badge de organización con el nombre ya resuelto                     | `viewingOrgId` apunta a otra organización Y el nombre ya está disponible                        |
| error (catálogo vacío)                | Mensaje menciona la organización elegida                                               | Confirmar export → 404 con `organization_id`                                                    |
| error (catálogo vacío, propia org)    | Mensaje genérico actual, sin cambios                                                   | Confirmar export → 404 sin `organization_id`                                                    |

**Nota de diseño (hallazgo Major del reviewer, resuelto acá)**: el estado
"loading (cross-org, nombre pendiente)" es OBLIGATORIO y debe ser
visualmente distinguible del estado "default (propia org)" — nunca deben
verse idénticos. Con `viewingOrgId` seteado a una organización distinta,
el banner NUNCA debe renderizarse sin ningún indicio de badge (ni vacío ni
ausente), porque eso sería indistinguible del caso "organización propia"
y anularía el propósito de AC1.1.5 (evitar exportar la organización
equivocada sin darse cuenta). Si el nombre tarda en resolver, mostrar un
placeholder/skeleton en el lugar del badge, nunca ocultarlo.

### Props / Inputs

| Prop         | Type                                                                            | Required | Default           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| organization | `{ kind: "own" } \| { kind: "loading" } \| { kind: "cross-org"; name: string }` | sí       | `{ kind: "own" }` | Unión discriminada (reemplaza el `organizationName: string \| undefined` del draft inicial — hallazgo Major del reviewer). `"own"`: sin `viewingOrgId`, no se renderiza el badge. `"loading"`: `viewingOrgId` seteado pero `useOrganizations()` todavía no resolvió el nombre — se renderiza el badge en estado skeleton. `"cross-org"`: nombre ya disponible — se renderiza el badge completo con `name`. La distinción `"own"` vs. `"loading"` es la que faltaba en el diseño inicial — ambos NO pueden colapsar al mismo `undefined`. |

### Responsive Behaviour

| Breakpoint          | Behaviour                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| mobile (<768px)     | El badge se apila arriba del resto del contenido del banner (no in-line) para no comprimir el texto |
| tablet (768–1024px) | Igual que desktop                                                                                   |
| desktop (>1024px)   | Badge in-line, arriba del contenido existente del banner                                            |

### Accessibility

| Requirement          | Implementation                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA role            | `status` (el badge es información, no una alerta bloqueante)                                                                                                                                                        |
| Keyboard interaction | N/A — el badge no es interactivo, no captura foco                                                                                                                                                                   |
| Label / aria-label   | Texto visible ya es descriptivo ("Exportando catálogo de: {organización}") — no hace falta `aria-label` adicional                                                                                                   |
| Contrast ratio       | WCAG AA 4.5:1 para el texto del badge; el color de fondo del badge (si usa uno) debe cumplir 3:1 contra el fondo del banner                                                                                         |
| Screen reader        | El texto del badge se lee como parte normal del flujo del banner (orden DOM natural) — no requiere `aria-live` porque el banner ya está visible cuando el badge aparece, no es una actualización dinámica posterior |
| Focus management     | Sin cambios — el foco sigue yendo a los botones "Cancelar"/"Continuar" del banner existente                                                                                                                         |

### Usage Example

```tsx
<ExportSummaryBanner
  organization={
    !viewingOrgId
      ? { kind: "own" }
      : organization?.name
        ? { kind: "cross-org", name: organization.name }
        : { kind: "loading" }
  }
  onContinue={handleConfirmExportSummary}
  onCancel={handleCancelExportSummary}
/>
```

## Interacción: mensaje de catálogo vacío cross-org (US2)

Sigue el patrón de error inline ya vigente (`ux-guide.md` § Feedback &
States: "Error: inline near the cause, red but with icon, actionable
message"). No es un cambio de patrón, solo de contenido textual (incluye
el nombre de la organización).

## Sin cambios de interacción

- `OrganizationPicker` (header): sin cambios de ningún tipo — mismo
  componente, mismo comportamiento, mismos estados (`component-inventory.md`).
- Flujo de prompt de nombre de archivo (`window.prompt`): sin cambios.
- Menú "Exportar" (`DropdownMenu`): sin cambios.
