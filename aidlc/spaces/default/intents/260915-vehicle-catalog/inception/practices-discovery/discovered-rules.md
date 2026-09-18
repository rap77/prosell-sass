# Discovered Rules — 260915-vehicle-catalog

> Integración final (Step 5). Reservado para restricciones DURAS de proceso de equipo
> (`ALWAYS`/`NEVER`) explícitamente afirmadas por el humano — no para
> decisiones de diseño de producto/arquitectura acotadas a este intent (esas
> van en `evidence.md` y `team-practices.md`, per el criterio ya reconfirmado
> varias veces en `project.md`: "una decisión de diseño acotada a un solo
> feature/intent... no se promueve a discovered-rules.md ## Mandated").

## Mandated

Ninguno todavía. El baseline ya afirmado en `project.md` (Conventional
Commits, squash-merge, pipeline de pre-commit completo, suite pytest en
pre-push/CI, confirmación manual de deploy a producción, manejo de errores
centralizado en frontend, corregir todo hallazgo de GGA en archivos tocados)
sigue vigente sin cambios — no se repite acá para no duplicarlo.

La entrevista (Step 4, Q1/Q2) no afirmó ninguna restricción DURA de proceso
de equipo nueva — confirmó únicamente el piso de test puntual (Q1) y la
decisión de agregar sanitización de fórmulas al export CSV (Q2), ambas
decisiones de diseño/implementación acotadas a este intent, documentadas en
`team-practices.md` y `evidence.md`, per el criterio ya reconfirmado varias
veces en `project.md`. El candidato sobre `IPublisherService`/los tres
adapters queda documentado como guía de implementación en
`team-practices.md` § Deployment (verificación contra los tres adapters +
manejo de credenciales de la corrección de devsecops), no como mandate
nuevo — no hubo confirmación humana explícita de una restricción dura, solo
de la guía de implementación en sí.

## Forbidden

Ninguno nuevo todavía. El baseline ya afirmado en `project.md` (`NEVER
--no-verify`, `NEVER Co-Authored-By`, `NEVER` deploy de producción
automático, `NEVER` walking skeleton) sigue vigente sin cambios.

## Corrections

Ninguna promoción a `## Mandated`/`## Forbidden` en este intent. Las
decisiones afirmadas en la entrevista (piso de test Q1, sanitización de
fórmulas CSV Q2) y las correcciones objetivas de las tres revisiones ciegas
(credencial de mayor alcance del adapter Playwright, inconsistencia de
ubicación de capa de `nhtsa_normalizer.py`, boundary backend/frontend de la
reconciliación #87) son específicas de este intent puntual — quedan
documentadas en `team-practices.md` y `evidence.md`, no acá.
