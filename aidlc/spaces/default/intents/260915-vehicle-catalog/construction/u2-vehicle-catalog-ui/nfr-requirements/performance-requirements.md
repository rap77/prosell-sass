# Performance Requirements — U2 (`u2-vehicle-catalog-ui`)

Basado en `functional-design/functional-spec.md` (3 workflows).

## NFR4.1: Sin degradación perceptible en los 3 flujos de UI

Corrección post-revisión: renombrado de `NFR-PERF-1` a `NFR4.1` — U2 no hereda ningún `NFRn` de inception (NFR1/NFR2 son responsabilidad exclusiva de U1), así que este requisito usa un grupo nuevo (`NFR4`) con formato `NFRx.y` — el sensor real de trazabilidad (`aidlc-sensor-traceability.ts`, patrón `NFR\d+\.\d+`) exige ese formato exacto, no el estilo `NFR-PERF-1` usado inicialmente.

- **Target**: el indicador de autocompletado fallido (Workflow 1), el consumo del catálogo canónico en el editor de schema (Workflow 2), y la edición de ubicación por producto (Workflow 3) no introducen un estado de carga adicional al ya esperado para un fetch de red estándar de la plataforma.
- **Justificación**: no hay NFR de inception que fije un número para estos flujos — mismo criterio "no degradar" ya usado en U1.
- **Verificación**: manual en Build and Test — confirmar que ningún flujo introduce un spinner/loading nuevo más allá de los 3 estados básicos ya fijados en Refined Mockups (loading/success/error).
