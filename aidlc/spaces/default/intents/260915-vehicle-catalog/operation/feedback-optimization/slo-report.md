# SLO Report — Intent 260915-vehicle-catalog

## Resumen

Sin SLO formal documentado a nivel de plataforma (confirmado en
`slo-config.md` de `observability-setup`: sin error-budget, sin ventana de
30 días). Este reporte documenta el estado real, no un cumplimiento
formal.

## Señal disponible: healthchecks binarios

| Servicio             | Mecanismo                         | Estado al cierre de este intent                          |
| -------------------- | --------------------------------- | -------------------------------------------------------- |
| `api` (prod/staging) | `curl -fL /api/v1/health/`        | Verde (ver `deployment-log.md`/`health-check-report.md`) |
| `web` (prod/staging) | `wget --spider /`                 | Verde                                                    |
| `db`, `redis`        | healthcheck nativo del contenedor | Verde                                                    |

Este binario (verde/rojo) es hoy la única señal de disponibilidad — sin
porcentaje de uptime medido, sin ventana rolling, sin error budget.

## Burn rate

No aplica — sin SLO, no hay error budget que consumir. `alarms.md`
(`observability-setup`) ya documentó por qué: volumen esperado de las 2
señales nuevas de este intent es cero/único, sin justificar alerta
automatizada.

## Recomendación (no bloqueante, fuera de alcance de este intent)

Si el equipo crece o el tráfico aumenta, definir un SLO real (ej.
disponibilidad de `api`/`web` medida con un canario externo simple) sería
el primer paso antes de cualquier error-budget policy — candidato para un
intent futuro, no resuelto acá (Q1, confirmado por el humano).
