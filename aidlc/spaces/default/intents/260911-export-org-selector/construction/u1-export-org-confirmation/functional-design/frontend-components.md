# Frontend Components — u1-export-org-confirmation

Formato: `.claude/knowledge/aidlc-design-agent/component-spec-template.md`
(ya usado en `refined-mockups/interaction-spec.md` — este archivo lo
formaliza a nivel de Functional Design, mismo contrato, sin
contradicciones).

## `ExportSummaryBanner` (existente, modificado)

| Field       | Value                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Component   | ExportSummaryBanner                                                                                       |
| Description | Banner de confirmación antes de exportar el catálogo; agrega badge de organización para el caso cross-org |
| Category    | feedback                                                                                                  |

### Props / Inputs

| Prop           | Type                                                                            | Required | Default           | Description                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------- | -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organization` | `{ kind: "own" } \| { kind: "loading" } \| { kind: "cross-org"; name: string }` | sí       | `{ kind: "own" }` | Unión discriminada (ver `functional-spec.md` § Workflow para la lógica de resolución). `"loading"` cubre tanto "nombre aún no resuelto" como "organización borrada/inaccesible" (Q2) — ambos casos se tratan igual hasta que el usuario confirme el export. |
| `onContinue`   | `() => void`                                                                    | sí       | —                 | Sin cambios (ya existente)                                                                                                                                                                                                                                  |
| `onCancel`     | `() => void`                                                                    | sí       | —                 | Sin cambios (ya existente)                                                                                                                                                                                                                                  |

### States

| State                               | Description                                           | Trigger                                                               |
| ----------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `organization.kind === "own"`       | Sin badge — contenido actual del banner               | Comportamiento por defecto                                            |
| `organization.kind === "loading"`   | Badge en skeleton — NUNCA se omite cuando corresponde | `viewingOrgId` seteado, nombre no resuelto o organización inaccesible |
| `organization.kind === "cross-org"` | Badge con nombre completo, destacado                  | Nombre resuelto vía `useOrganizations()`                              |

### Interaction flow

1. El componente padre (`catalog/page.tsx`) resuelve `organization` en
   cada render, per el workflow de `functional-spec.md`.
2. `ExportSummaryBanner` es PURO respecto a `organization` — no hace
   fetch propio, no tiene estado interno para esto (el fetch ya lo hace
   `useOrganizations()` en el padre, patrón ya vigente en
   `OrganizationPicker`).
3. Sin nuevo manejo de foco ni teclado — el badge no es interactivo (ver
   `refined-mockups/accessibility-checklist.md`, ya vigente sin cambios).

### Form validation

No aplica — este componente no tiene campos de formulario.

### API integration points

- `useOrganizations()` (`GET /api/v1/admin/organizations`, ya existente,
  ya gateado por `ORG_ADMIN_VIEW_ALL` server-side) — resuelve `name` y la
  lista completa de organizaciones accesibles (usado para detectar el
  caso "borrada/inaccesible": si `viewingOrgId` no está en la lista
  devuelta).
- `exportCatalogClientFormat(organizationId?: string)` (`products.ts`) —
  firma modificada para aceptar el parámetro opcional (ver
  `functional-spec.md` paso 5).

## Componente NO modificado: `OrganizationPicker`

Sin cambios de ningún tipo — solo se lee su store compartido
(`organizationStore.viewingOrgId`), per la decisión ya cerrada en
Requirements Analysis (FR1.3).
