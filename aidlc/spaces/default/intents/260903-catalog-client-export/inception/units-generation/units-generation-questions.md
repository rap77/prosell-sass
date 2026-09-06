# Units Generation — Questions

## Nota: bloque de estrategia de decomposición (Step 3) omitido

`components.md` (Domain Design, ADR-001) ya estableció una única
decomposición viable a nivel de componente de dominio: todo vive en
`Product` (dominio ya existente), sin componente nuevo. A nivel de
**unidades de construcción** (esta etapa), sí existe una frontera de
despliegue/prueba genuina y no ambigua, ya dada por la estructura del
monorepo — no una decisión de diseño a debatir:

- Backend (`apps/api`, FastAPI) y frontend (`apps/web`, Next.js) son dos
  deployables independientes (imágenes Docker separadas, suites de test
  separadas — `pytest` vs `vitest`), ya así en todo el resto del sistema.
- El patrón de Unit `kind: ui` para piezas 100% frontend, separado de
  `kind: service` para lógica de negocio backend, ya está establecido en
  este proyecto (usado en el intent `260829-auth-navigation-refactor`,
  team-practices confirma sin objeción que este feature no amerita
  ninguna especialización nueva de convención).
- No hay más de una frontera de despliegue/servicio/dominio distinta que
  justifique una decomposición distinta a "un Unit por deployable
  tocado" — análogo a la convención ya establecida en Domain Design para
  saltar el bloque de opciones cuando solo hay una decomposición viable
  (ver `project.md`, aprendizaje del intent `260829-auth-navigation-refactor`).

Por eso se omite el bloque interactivo de Step 3-4 (estrategia de
decomposición, granularidad, modelo de despliegue) y se presenta
directamente el plan propuesto para aprobación en el gate de Step 5.

## Plan propuesto (Step 5 — Get Plan Approval)

**2 Units**, uno por deployable tocado, con dependencia unidireccional
frontend → backend (el frontend llama al endpoint nuevo del backend):

| Unit ID | Directory               | Kind    | Complejidad | Responsabilidad                                                                                                                                                                                                                               |
| ------- | ----------------------- | ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1      | `u1-catalog-export-api` | service | M           | Backend: endpoint nuevo de export (24 columnas formato cliente), armado del ZIP de imágenes (incl. fix del bug de `exterior_color`), sanitización de nombres, enforcement del cap de recursos (NFR3/US1.3), subclase nueva de `ProductError`. |
| U2      | `u2-catalog-export-ui`  | ui      | S           | Frontend: acción "Exportar catálogo" en `catalog/page.tsx`, diálogo de nombre/ruta sugerida (US1.2), estados de carga/éxito/error, guard de doble-clic.                                                                                       |

**Dependencia**: `u2-catalog-export-ui` depende de `u1-catalog-export-api`
(llama al endpoint nuevo) — sin dependencia inversa, sin ciclos. Ambos
Units son `embedded` (código nuevo dentro de los servicios `apps/api`/
`apps/web` ya existentes, no un deployable nuevo).

**Mapeo de historias**:

- US1.1 (export CSV+ZIP) — cross-cutting U1 (genera el archivo) + U2
  (dispara la descarga); target principal de trazabilidad: U1.
- US1.2 (nombre sugerido) — solo U2 (100% client-side, sin componente
  backend — ya confirmado en `components.md` § Nota de trazabilidad —
  US1.2).
- US1.3 (aviso de límite excedido) — cross-cutting U1 (enforcement + error
  específico) + U2 (renderiza el mensaje); target principal: U1.

Esto valida además que Contract Design (próxima etapa, 2.8, en alcance
para este scope `classic`) tiene sentido: formaliza el contrato del
endpoint nuevo entre U1 y U2 antes de la construcción paralela.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
