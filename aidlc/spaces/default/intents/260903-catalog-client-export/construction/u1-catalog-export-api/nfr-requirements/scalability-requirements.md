# Scalability Requirements — u1-catalog-export-api

Formaliza el cap de recursos ya requerido en `requirements.md` NFR3
("el endpoint DEBE acotar el volumen de datos/imágenes procesadas en una
sola respuesta") — el número exacto quedó diferido explícitamente hasta
esta etapa (`contract-summary.md` § Open Questions).

## Cap de recursos

```
NFR3.1: Cap de productos por export
Current baseline: sin cap hoy (comportamiento del export genérico
  existente, `export.csv`, no acota — riesgo ya documentado).
Target capacity: máximo 500 productos published por export.
Growth model: n/a — el cap es un límite de seguridad por request, no una
  proyección de crecimiento.
Scaling approach: rechazo explícito (413 Payload Too Large, ya fijado en
  Functional Design) al exceder el cap — no hay escalado automático de
  este límite; es un valor fijo revisable en una futura iteración si el
  negocio lo justifica.
Degradation policy: rechazo total de la request (no exporta un
  subconjunto parcial silenciosamente) — el usuario ve un mensaje
  explícito (`stories.md` AC1.3.1) y puede reintentar en otro momento o
  contactar soporte.
```

**Justificación del número (500)**: un catálogo de dealer típico en
ProSell ronda decenas a bajos cientos de vehículos — 500 deja margen
generoso sin arriesgar agotamiento de memoria armando el ZIP (el riesgo
real de NFR3 es la memoria ocupada por las imágenes durante el armado,
no la cantidad de filas del CSV en sí — por eso NO se reutiliza el
precedente `max_rows=5000` del import de CSV, que no carga imágenes en
memoria simultáneamente).

## Concurrencia

Sin requisito de escalado horizontal nuevo — el endpoint corre dentro del
servicio FastAPI (`apps/api`) ya existente, sin infraestructura adicional
(sin colas, sin workers dedicados). El caso de uso esperado es un dealer
exportando su propio catálogo ocasionalmente, no tráfico sostenido de
alto volumen — no se identifica necesidad de rate limiting específico más
allá del ya vigente a nivel de aplicación (`rate_limit_middleware.py`).

## Crecimiento de datos

No aplica — el export no persiste ningún dato nuevo (Domain Design ADR-002),
por lo que no hay tasa de crecimiento de almacenamiento que planificar
para este Unit.
