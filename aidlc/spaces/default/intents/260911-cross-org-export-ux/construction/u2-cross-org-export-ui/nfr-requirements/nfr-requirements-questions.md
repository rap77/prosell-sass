# NFR Requirements — Preguntas (u2-cross-org-export-ui)

## Nota: bloque interactivo omitido

`kind: ui` solo requiere `performance-requirements.md`,
`security-requirements.md` y `tech-stack-decisions.md`
(`produces_kinds` excluye scalability/reliability/observability para
UI, mismo criterio ya aplicado en `u2-catalog-export-ui` del intent
hermano `260903-catalog-client-export`). Sin ambigüedad genuina: la
responsividad de UI y la superficie de seguridad de este Unit ya están
acotadas por `functional-spec.md`/`frontend-components.md` (Functional
Design, ya READY) — U2 no participa en la resolución de autorización,
autenticación ni sanitización (responsabilidad exclusiva de
`u1-cross-org-export-api`), solo dispara requests y renderiza
respuestas/estados.

## Plan propuesto (extiende sin cambio el precedente de 260903)

- **performance-requirements.md**: targets de responsividad de UI
  (apertura de banner, transición de estados de carga, render de
  toast/error) — mismo criterio que `u2-catalog-export-ui`, extendido
  con una nota sobre el refetch de la grilla al cambiar de organización
  (FR3.1), que reusa el mismo endpoint/baseline de performance ya
  existente (`GET /api/v1/products`), sin target nuevo dedicado.
- **security-requirements.md**: sin superficie nueva — el filtrado
  client-side del picker por `product_count` y el sentinel `"ALL_ORGS"`
  no bypasean ningún control (la autorización real sigue viviendo en
  `u1-cross-org-export-api`); se agrega una nota explícita sobre el
  filtrado real de la grilla (FR3.1) no introduciendo ningún IDOR nuevo,
  ya que el servidor sigue aplicando `_check_org_scope_permission()` del
  lado de `list_products` independientemente de lo que el cliente pida.
- **tech-stack-decisions.md**: sin dependencias nuevas — reusa
  componentes/cliente API ya existentes (`window.prompt()`,
  `useInfiniteProducts()`, `sonner`).

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
