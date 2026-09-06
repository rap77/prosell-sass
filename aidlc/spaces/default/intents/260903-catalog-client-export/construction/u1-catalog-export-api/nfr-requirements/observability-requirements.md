# Observability Requirements — u1-catalog-export-api

## Logging

| Evento                         | Nivel     | Campos requeridos                                             | Justificación                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imagen individual no legible   | `warning` | `product_id`, referencia de imagen (`image_key`/URL)          | Ya fijado en `rules.md` BR4.2, `stories.md` AC1.1.6 — mínimo para diagnóstico posterior.                                                                                                                                                                                                                                                                                  |
| Export completado exitosamente | `info`    | `organization_id`, cantidad de productos exportados, duración | Evento de negocio significativo — quién exportó y cuándo (gap señalado por el reviewer de Requirements Analysis, hallazgo Minor #5: "no hay ningún requerimiento de observabilidad para el nuevo endpoint"). No requiere un audit trail completo tipo `ProductAuditLog` (fuera de alcance, ya evaluado en Functional Design) — un log de aplicación estructurado alcanza. |
| Cap de recursos excedido (413) | `warning` | `organization_id`, cantidad de productos que excedía el cap   | Permite detectar si el cap de 500 (NFR3.1) resulta insuficiente en la práctica y necesita revisión futura.                                                                                                                                                                                                                                                                |
| Catálogo vacío (404)           | `info`    | `organization_id`                                             | Volumen bajo esperado, útil para detectar confusión de UX si es frecuente.                                                                                                                                                                                                                                                                                                |

Ningún log incluye datos sensibles (no hay PII de terceros en el flujo,
per `security-requirements.md`).

## Métricas

- **Application metrics** (RED method): tasa de requests al endpoint,
  tasa de error (por tipo: 404/413/500), duración de la request
  (histograma, para validar `performance-requirements.md` NFR-PERF-1/2).
- Sin métrica de negocio nueva más allá del conteo de exports — no
  justifica un dashboard dedicado para un feature de este tamaño.

## Tracing

Sin requisito de tracing distribuido nuevo — el flujo es una única
operación síncrona dentro de un solo servicio (`apps/api`), sin llamadas
a otros servicios internos del sistema más allá de la lectura de storage
(`get_object()`), que ya queda cubierta por el logging de NFR-REL-1.

## Alerting

Sin alerta nueva dedicada — el volumen de uso esperado (exports
ocasionales, manuales, por dealer) no justifica un alert propio más allá
de las alertas ya vigentes de error-rate general de la API. Si el log de
`413 (cap excedido)` se vuelve frecuente, es una señal para revisar el
valor de NFR3.1 manualmente, no para una alerta automatizada nueva en
este intent.
