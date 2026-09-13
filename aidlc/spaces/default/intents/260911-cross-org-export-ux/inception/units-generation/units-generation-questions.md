# Units Generation — Plan de decomposición (260911-cross-org-export-ux)

`components.md` está ausente porque Domain Design fue SKIP legítimamente
(todo el trabajo son modificaciones a componentes ya existentes, sin
building block nuevo) — la frontera de Unit se deriva de
`component-inventory.md` del codekb en su lugar (mismo patrón ya
aprendido en `260911-export-org-selector`).

Se omite el bloque interactivo de estrategia de decomposición (Step 3):
la frontera coincide exactamente con la estructura de deployables ya
existente del monorepo (`apps/api` vs `apps/web`) — mismo patrón ya
reconfirmado en `260829-auth-navigation-refactor` y
`260903-catalog-client-export` cuando no hay ambigüedad genuina de
frontera. `team-practices.md` § Way of Working ya reconfirma el
precedente `260903-catalog-client-export` (backend + frontend en el
mismo Bolt) como el que aplica acá — la pregunta de secuenciación
económica queda para Delivery Planning (2.9), no para esta etapa
(2.7, topología solamente).

## Plan propuesto

**2 Units**, alineadas 1:1 con los dos deployables ya existentes:

### U1 — `u1-cross-org-export-api` (backend, kind: service)

- **Responsabilidad**: extiende `apps/api` — corrección del mapeo de
  valores del CSV cliente (FR7), export "todas las organizaciones"
  (FR2, FR4, FR6), y las decisiones de resolución batch de `org_code`
  por-producto y tabla de traducción de categorías ya documentadas
  como guía de implementación en `team-practices.md`.
- **Historias que implementa**: US2.1 (backend), US4.1, US4.2, US4.3,
  US4.4, US4.5, US6.1, US7.1-US7.6, US8.2 (columna `path`), US9.2
  (fallback de grupos FB).
- **Complejidad relativa**: L (múltiples transformaciones de valor +
  nuevo método de repositorio cross-tenant + caso de uso "todas").
- **Sin dependencia de U2** para poder implementarse y testearse de
  forma aislada (los endpoints ya son consumibles sin la UI que los
  cablea) — pero ninguna de las dos Units entrega valor de usuario
  observable por sí sola sin la otra (mismo criterio ya confirmado en
  `team-practices.md`), lo cual es una decisión de Delivery Planning,
  no de esta etapa.

### U2 — `u2-cross-org-export-ui` (frontend, kind: ui)

- **Responsabilidad**: extiende `apps/web` — rename/filtro del
  selector de organización (FR1), sentinel "todas" en el picker (FR2 —
  UI), filtrado real de la grilla de `/catalog` (FR3), confirmación de
  UI reforzada (FR5), y los dos popups nuevos (FR8, FR9 — UI).
- **Historias que implementa**: US1.1, US1.2, US2.1 (UI), US2.2, US3.1,
  US3.2, US3.3, US5.1, US8.1, US9.1.
- **Complejidad relativa**: M (extensión de 3 componentes ya
  existentes, sin UI nueva desde cero — ver `refined-mockups/`).
- **Depende de U1**: los endpoints de backend (`organization_id`,
  sentinel "todas", columnas corregidas) deben existir para que U2
  tenga contra qué integrar en Build and Test — dependencia de
  INTEGRACIÓN (contrato de API), no de implementación (U2 puede
  construirse en paralelo contra un contrato ya fijado en
  `requirements.md`).

## Modelo de dependencia

```yaml
units:
  - name: u1-cross-org-export-api
    kind: service
    depends_on: []
  - name: u2-cross-org-export-ui
    kind: ui
    depends_on: [u1-cross-org-export-api]
```

Sin oportunidad de paralelismo total (U2 depende de U1 para el
contrato de API), pero SÍ de paralelismo de trabajo — ambas Units
pueden desarrollarse simultáneamente contra el contrato ya fijado en
`requirements.md`/`stories.md`, integrando en Build and Test.

## Modelo de despliegue

Cada Unit sigue el mismo camino de deploy-on-merge ya afirmado — ambas
se despliegan desde el mismo push a `main` (mismo pipeline CI/CD ya
existente que construye y despliega `apps/api` y `apps/web` juntos),
sin coordinación especial entre ellas (ya documentado en
`team-practices.md` § Deployment).

## Gate de aprobación del plan

```question
prompt: "¿Aprobás este plan de 2 Units (u1-cross-org-export-api backend, u2-cross-org-export-ui frontend, U2 depende de U1) o preferís revisarlo?"
header: "Plan de Units"
multiSelect: false
options:
  - label: "Approve Plan"
    description: "2 Units tal cual, alineadas con los deployables existentes"
  - label: "Revise Plan"
    description: "Ajustar el número de Units o sus fronteras"
```

[Answer]: Approve Plan

## Consolidated Summary Confirmation

- 2 Units aprobadas: U1 (u1-cross-org-export-api, backend, kind service) y U2 (u2-cross-org-export-ui, frontend, kind ui), U2 depende de U1 por contrato de API.
- Las 24 historias de `stories.md` están asignadas (2 cross-cutting: US2.1, US2.2).
- 1 aprendizaje persistido (criterio de granularidad de Units por cohesión de archivo/función).

Does this all look correct before closing the Units Generation stage?

```question
prompt: "Does this all look correct before closing the Units Generation stage?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, cerrar la etapa"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de cerrar"
```

[Answer]: Looks correct
