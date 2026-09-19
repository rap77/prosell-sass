# Anomaly Config — Intent 260915-vehicle-catalog

## Resumen

Sin detección de anomalías nueva. Sin plataforma de anomaly detection (ej.
CloudWatch Anomaly Detection) en este proyecto — no aplica, y ninguno de los
diseños de NFR/Infrastructure de este intent (ambas Units, ambos READY)
identificó una métrica con patrón lo suficientemente estable/volumen
suficiente como para justificar detección automática de desvíos.

Las 2 señales nuevas de este intent (warning de `field_key`, resumen de
migración legacy) son de volumen bajo/único — un umbral estático ("cualquier
ocurrencia > 0 amerita revisión", ya documentado en `alarms.md`) es
suficiente y más simple que un modelo de anomalías.

## Decisión de esta etapa (Q1, confirmada por el humano)

Sin detección de anomalías nueva — se confirma la conclusión del diseño.
