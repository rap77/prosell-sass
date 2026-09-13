# Observability Requirements — u1-cross-org-export-api

Extiende la tabla de logging ya establecida en el intent hermano
`260903-catalog-client-export`, agregando el evento distinguible
requerido por FR6.1/NFR1 de `requirements.md` (BR2.5 de `rules.md`)
para el modo "todas las organizaciones".

## Logging

| Evento                                                       | Nivel     | Campos requeridos                                                                                                                                                                        | Justificación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imagen individual no legible                                 | `warning` | `product_id`, referencia de imagen (`image_key`/URL)                                                                                                                                     | Sin cambio respecto a `260903` — mínimo para diagnóstico posterior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Export completado (caso puntual)                             | `info`    | `organization_id`, cantidad de productos exportados, duración                                                                                                                            | Sin cambio respecto a `260903`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Export completado, modo `all_organizations=true` (NUEVO)     | `info`    | `scope=ALL_ORGS`, `user` (id del usuario), `own_org` (organización propia del usuario), cantidad total de productos exportados, cantidad de organizaciones distintas incluidas, duración | Formaliza BR2.5/FR6.1/NFR1 — campo `scope=ALL_ORGS` distingue explícitamente este evento del de export cross-org puntual (que ya loguea `user`/`own_org`/`exported_org`, sin cambio). Mismo mecanismo (`logger.info()` estructurado, sin tabla de auditoría dedicada), contenido distinto — grepeable por `scope=ALL_ORGS` para responder "¿alguna vez se exportó el catálogo completo de la plataforma?". La cantidad de organizaciones incluidas es el mismo número que ya se muestra en el banner de confirmación de UI reforzado (FR5.1), para que el log sea auditable contra lo que el usuario vio antes de confirmar. |
| Cap de recursos excedido (413), caso puntual                 | `warning` | `organization_id`, cantidad de productos que excedía el cap                                                                                                                              | Sin cambio respecto a `260903`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Cap de recursos excedido (413), modo "todas" (NUEVO)         | `warning` | `scope=ALL_ORGS`, cantidad total de productos que excedía el cap global                                                                                                                  | Permite distinguir si el cap global de NFR3.2 resulta insuficiente en la práctica, separado de la señal por-organización ya existente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Catálogo vacío (404), cualquier modo                         | `info`    | `organization_id` (puntual) o `scope=ALL_ORGS` (modo "todas")                                                                                                                            | Sin cambio de mecanismo respecto a `260903` — se extiende con el campo `scope` para el caso "todas".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Sin permiso `ORG_ADMIN_VIEW_ALL` (403), modo "todas" (NUEVO) | `warning` | `user`, `own_org`                                                                                                                                                                        | Complementa NFR2.4 (`security-requirements.md`) — permite detectar intentos repetidos de acceso al modo "todas" sin el permiso requerido.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Ningún log incluye datos sensibles (sin PII de terceros en el flujo,
per `security-requirements.md` — sin cambio).

## Métricas

- **Application metrics** (RED method): tasa de requests al endpoint,
  tasa de error (por tipo: 403/404/413/500), duración de la request
  (histograma, para validar `performance-requirements.md` NFR-PERF-1/2/4)
  — sin desagregar por modo (puntual vs. "todas") en un dashboard
  dedicado nuevo, ya que el volumen de uso esperado del modo "todas" es
  bajo (uso administrativo ocasional).
- Sin métrica de negocio nueva más allá del conteo de exports por modo,
  ya cubierto por el campo `scope` del log estructurado — no justifica
  un dashboard dedicado para este feature.

## Tracing

Sin requisito de tracing distribuido nuevo — el flujo sigue siendo una
única operación síncrona dentro de un solo servicio (`apps/api`), sin
llamadas a otros servicios internos más allá de storage (`get_object()`,
ya cubierto por logging existente) y de las queries batch internas
(`org_code`, walk-up de categoría) — mismo criterio que `260903`.

## Alerting

Sin alerta nueva dedicada — decisión ya afirmada en Practices Discovery
(`team.md` § Deployment): el radio de explosión mayor del modo "todas"
se mitiga con auditoría distinguible (`scope=ALL_ORGS`, grepeable) y
confirmación de UI reforzada (FR5.1), no con infraestructura de
alerting nueva. Si el log `scope=ALL_ORGS` aparece con una frecuencia
inesperada, es una señal para revisión manual, no para una alerta
automatizada en este intent.
