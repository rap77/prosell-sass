# Feedback & Optimization — Preguntas

Etapa 4.7 (Operation phase, ÚLTIMA etapa) del intent **260915-vehicle-catalog**.

Contexto: el proyecto no usa AWS (sin Cost Explorer, sin AWS Config, sin
Trusted Advisor). `slo-config.md` de `observability-setup` ya concluyó "sin
SLOs formales documentados a nivel de plataforma".

## Pregunta 1 — SLO

`slo-config.md` concluyó que el proyecto no tiene SLOs formales (sin
error-budget, sin ventana de 30 días). ¿El reporte documenta ese estado
real (solo healthchecks binarios ya vigentes), o definimos un SLO recién
ahora?

- A. Documentar el estado real — sin SLO formal, solo healthchecks binarios
- B. Definir un SLO real ahora (ej. 99.5% disponibilidad)
- X. Other (please specify)

[Answer]: A

## Pregunta 2 — Costo

Este intent no agregó infraestructura nueva (mismos 6 servicios Docker,
mismo droplet). ¿Documento el costo incremental como $0, o también el
costo base del droplet?

- A. $0 incremental, sin detalle de costo base
- B. También documentar el costo base del droplet
- X. Other (please specify)

[Answer]: B

## Pregunta 2b — Monto del costo base

¿Cuánto pagás por mes por el droplet (y otros costos fijos relacionados)?

- A. No lo sé con precisión ahora — documentar como "no relevado en esta etapa"
- B. Monto exacto (especificar)
- X. Other (please specify)

[Answer]: A

## Pregunta 3 — Drift

Sin AWS Config, el chequeo real disponible es comparar
`docker-compose.*.yml` vs. lo que corre, y el head de Alembic vs. el repo.
¿Corro esa verificación ahora contra staging (accesible localmente), o la
documento como chequeo manual pendiente?

- A. Verificar contra staging ahora
- B. Documentar como chequeo pendiente
- X. Other (please specify)

[Answer]: A

**Resultado de la verificación real** (corrida en esta etapa):

- Alembic: repo `20260917_0001 (head)` == staging DB `20260917_0001` — **sin drift**.
- Contenedores de staging: `prosell-staging-web`, `-api`, `-db`, `-redis`
  healthy; **`prosell-staging-minio` está `Exited (255)`** (log: "Exiting
  on signal: TERMINATED" — apagado limpio, no un crash) — drift real
  detectado, documentado en `drift-report.md`.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
