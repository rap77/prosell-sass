# Tech Stack Decisions — U2 (`u2-vehicle-catalog-ui`)

Basado en `requirements.md` § Constraints ("sin herramienta o librería nueva").

## Decisión: sin tech stack nuevo

Los 3 flujos de U2 se implementan sobre componentes/patrones ya existentes: `SchemaFieldRenderer.tsx`, `SelectControlled`, React Hook Form + Zod (formularios), TanStack Query (fetch de datos), `OrganizationFormFields.tsx` (patrón de campos ciudad/estado). Sin librería nueva — mismo stack ya vigente en `apps/web`.

## Rationale

Mismo criterio ya afirmado en U1: este intent es correctivo/estructural sobre superficie ya en producción, no hay justificación para introducir una dependencia nueva.
