# Evidence — Final, intent `260911-cross-org-export-ux`

## Sources

- `aidlc/spaces/default/memory/team.md` — las cinco secciones afirmadas
  (Way of Working, Walking Skeleton, Testing Posture, Deployment, Code
  Style), leídas íntegras como baseline de este re-run.
- `aidlc/spaces/default/memory/org.md` — pisos por scope (Testing
  Posture: `classic` añade piso de 80% de cobertura + CI antes de
  merge).
- `aidlc/spaces/default/codekb/prosell-sass/reverse-engineering-timestamp.md`
  — bloque superior (fecha 2026-09-11, intent `260911-cross-org-export-ux`),
  Scan Coverage y hallazgos 1-8, más la sección "Deuda técnica señalada,
  no resuelta por este scan" (3 decisiones de diseño pendientes:
  sentinel "todas", mapeo árbol-de-categorías→columnas planas,
  fidelidad de `location`/`state`).
- `aidlc/spaces/default/codekb/prosell-sass/code-quality-assessment.md`,
  hallazgos #77-86 — detalle línea-por-línea de: label a renombrar (#77),
  filtrado client-side por `product_count` (#78), gap real de filtrado
  de grilla (#79), mapeo de VALOR (no solo clave) para `clean_title`/
  `groups`/`category`/`type`/`location` (#80-82), capacidad cross-tenant
  ya presente en repositorio pero bloqueada en el use case por
  resolución de `org_code` una-sola-vez (#83), `EXPORT_MAX_PRODUCTS=500`
  como cap por-tenant a reconsiderar (#84), asimetría de convención
  `organization_id` omitido = "propio" (export) vs. "todas" (`list_products`)
  (#85), patrón UX de `window.prompt()` con default reusable (#86).
- `aidlc/spaces/default/codekb/prosell-sass/api-documentation.md`,
  líneas 270 y 279-281 — confirma la ausencia de sentinel "todas" hoy y
  documenta la asimetría de convención como diseño intencional del
  endpoint de export, no un bug.
- `git rev-parse HEAD` → `cff92e8d0572e29ed715522b01f27c02773609dd`
  (rama `main`), para el timestamp de esta etapa.
- Las 3 revisiones ciegas de Step 3 (`contributions/aidlc-quality-agent.md`,
  `contributions/aidlc-developer-agent.md`, `contributions/aidlc-devsecops-agent.md`)
  — cada una releyó el draft completo del lead más el subconjunto de
  hallazgos del codekb relevante a su rol, y developer además leyó
  directamente `bulk_upload_vehicles.py` (líneas 126, 171, 430-469) y
  `csv_export.py` (imports reales: solo `re`/`collections.abc.Mapping`)
  para verificar precedentes de código no citados por el codekb.
- `practices-discovery-questions.md` — entrevista humana completa (Q1,
  Q2), ambas respondidas.

## Corrección aplicada tras revisión (quality)

El draft del lead afirmaba que este intent era el primero en cruzar
`apps/api` + `apps/web` en un solo Bolt, a diferencia de
`260903-catalog-client-export` y `260911-export-org-selector` (ambos
acotados a una sola Unit/deployable). **Esa premisa era fácticamente
incorrecta**: `260903-catalog-client-export` ya bundleó
`u1-catalog-export-api` (backend) + `u2-catalog-export-ui` (frontend) en
un solo Bolt (aprendizaje ya persistido en `project.md` § Testing
Posture / Delivery Planning). Corregido en `team-practices.md` §
Way of Working — el precedente real es `260903-catalog-client-export`,
y este intent es una reconfirmación de ese patrón ya probado, no una
situación nueva. La conclusión de fondo (no hace falta convención de
branch/Bolt distinta) no cambia con la corrección.

## Observación de CI cross-stack (quality, no bloqueante)

`team.md` § Testing Posture ya documenta que pre-push local solo corre
`pytest -q` (sin Vitest) — asimetría ya aceptada como convención de
equipo, mismo espíritu que la asimetría de gates de lint ya aceptada. No
amerita una decisión nueva. Se deja registrado como observación en
`team-practices.md` § Testing Posture: para este Bolt en particular
(dependencias reales cruzadas entre `apps/api` y `apps/web`), la
cobertura cross-stack real (ambos lenguajes, suite completa) ocurre en
push/PR (CI), no en pre-push local.

## Assumptions & Open Questions

Ninguna asunción propia distinta de las ya documentadas como preguntas
abiertas de diseño en el codekb (no resueltas por evidencia de código,
pendientes para Requirements Analysis / Functional Design, NO
resolubles en Practices Discovery). Los dos puntos genuinos de criterio
de equipo que sí correspondían a esta etapa (piso de tests, auditoría +
confirmación de UI para "todas") ya fueron resueltos por la entrevista
humana — ver `practices-discovery-questions.md` y el resumen abajo.
Quedan explícitamente diferidas a Requirements Analysis / Functional /
NFR Design:

1. Qué forma toma el sentinel "todas las organizaciones" en
   `organizationStore.viewingOrgId` (overload del campo existente vs. un
   enum paralelo) y cómo se relaciona explícitamente con la asimetría
   ya documentada de `organization_id` omitido en el endpoint de export
   (hallazgo #85 / api-documentation.md líneas 279-281).
2. Qué nivel del árbol de categorías real (3-4 niveles) mapea a cada una
   de las 2 columnas planas `category`/`type` del CSV cliente (hallazgo
   #81) — decisión de producto, no inferible del código ni de la data
   de seed. (La CAPA donde vive la función que implemente esta decisión
   sí quedó resuelta en esta etapa — ver `team-practices.md` § Testing
   Posture, precedente de implementación de developer: resolución en el
   use case, mapeo puro en `csv_export.py`.)
3. Cómo tratar la pérdida de fidelidad de `location`/`state`
   (`location_state` persistido como código, CSV de muestra espera
   nombre completo) — agregar tabla de reverse-lookup, aceptar exportar
   el código, u otra vía (hallazgo #82).
4. Si `EXPORT_MAX_PRODUCTS=500` debe pasar a ser un cap global (no
   por-tenant) para el modo "todas las organizaciones", y qué hacer si
   se pisa (subir el límite, paginar, o aceptar que puede fallar en
   catálogos grandes) (hallazgo #84) — explicitando también, per
   devsecops, que el ZIP se arma completo en memoria antes de streamear,
   así que el riesgo de memoria del proceso escala con el total de la
   PLATAFORMA (no de un tenant) para el modo "todas", independientemente
   de qué valor final tome el cap.
5. Mecanismo exacto de la confirmación de UI más fuerte para "exportar
   todas" (afirmado que hace falta un paso más fuerte en la entrevista,
   Q2b) — texto de advertencia adicional vs. palabra de confirmación
   tipeada vs. otro mecanismo. Queda abierto para Functional Design.

Estas cinco preguntas son de **diseño de producto/arquitectura**, no de
**práctica de equipo** — quedan fuera del alcance de esta etapa
(consistente con el criterio ya aplicado en intents previos: ver
`project.md` § Forbidden, entrada afirmada 2026-09-11 sobre
`260911-export-org-selector`, que distingue explícitamente decisiones de
diseño de producto de constraints de proceso de equipo).

## Decisiones de la entrevista humana (Step 4) — resumen

- **Q1 (piso de tests)**: afirmados los 6 puntos tal cual (los 4 del
  draft original del lead + los 2 que sumó quality: filtro de
  `product_count`, wiring de los 2 popups nuevos). Documentado en
  `team-practices.md` § Testing Posture.
- **Q2a (auditoría "todas")**: sí, el log debe distinguir explícitamente
  el caso "todas" de un target puntual — mismo mecanismo
  (`logger.info()` estructurado, sin tabla nueva), contenido distinto.
  Documentado en `team-practices.md` § Deployment.
- **Q2b (confirmación de UI "todas")**: sí, necesita un paso de
  confirmación más fuerte que el banner ya existente para una
  organización ajena puntual — mecanismo exacto diferido a Functional
  Design (pregunta abierta #5 arriba).

## Decisión de diseño acotada a este intent (no promovida a Mandated)

El piso mínimo de 6 tests, la auditoría distinguible para "todas", y la
confirmación de UI más fuerte para "todas" son específicos de la
superficie nueva de ESTE intent — sigue el mismo criterio ya aplicado en
`260903-catalog-client-export` y `260911-export-org-selector`: una
decisión de piso de test o de guía de implementación puntual se
documenta en `team-practices.md`, no se promueve a `discovered-rules.md`
§ Mandated, que queda reservado para restricciones de proceso de equipo
general.

## Confirmación

Resumen confirmado por el humano ("Looks correct") en `practices-discovery-questions.md` § Consolidated Summary Confirmation.
