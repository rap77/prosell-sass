# Logical Components (NFR Design) — u1-export-org-confirmation

## Sin componentes lógicos nuevos

Este Unit no introduce ningún componente lógico nuevo relevante a NFRs
(no hay cache layer, circuit breaker, rate limiter, ni observability
sidecar que agregar). Los componentes ya existentes que el Unit consume
sin modificar su diseño interno:

| Componente                            | Rol en este Unit                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `organizationStore` (Zustand)         | Fuente de `viewingOrgId`, ya diseñado y auditado                             |
| `useOrganizations()` (TanStack Query) | Fuente del nombre de organización, ya con su propia estrategia de cache      |
| `ExportSummaryBanner`                 | Componente de UI modificado (prop nuevo, sin cambio de diseño lógico de NFR) |

Ver `functional-design/frontend-components.md` para la especificación
completa del componente modificado — este archivo documenta que, desde
la perspectiva de NFR Design, no hay nada adicional que diseñar.
