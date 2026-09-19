# Incident Response — Preguntas

Etapa 4.5 (Operation phase) del intent **260915-vehicle-catalog**.

Contexto: `observability-setup` (READY, aprobado) concluyó sin dashboard/alerta/SLO
nuevo — solo 2 logs nuevos de bajo volumen. NFR/Infrastructure Design de
ambas Units (`u1-vehicle-catalog-api`, `u2-vehicle-catalog-ui`) confirmaron
"sin infraestructura nueva". El proyecto no usa AWS (sin Incident Manager,
sin SSM Automation, sin AWS Backup) — infraestructura real: droplet
self-hosted con Docker Compose + Caddy (reverse proxy/SSL) + GitHub Actions.

## Pregunta 1 — Modos de falla nuevos vs. genéricos de plataforma

Modos de falla ya conocidos de la plataforma: caída de contenedor individual
(api/web/db/redis), fallo de la migración Alembic al arrancar, disco lleno,
certificado SSL de Caddy vencido. ¿Este intent (catálogo canónico de
vehículos) agrega algún modo de falla nuevo, o son todos genéricos ya
cubiertos?

- A. Solo genéricos de plataforma — sin modo de falla nuevo
- B. Hay uno específico de este intent (especificar)
- X. Other (please specify)

[Answer]: A

## Pregunta 2 — Escalamiento y guardia

¿Quién responde si algo falla en producción hoy? El proyecto es de equipo
chico, sin guardia formal rotativa documentada hasta ahora.

- A. Vos sos el único responsable hoy — sin rotación formal
- B. Hay más gente en el equipo (especificar)
- X. Other (please specify)

[Answer]: A

## Pregunta 3 — RTO/RPO con el backup real verificado

Verificado contra `scripts/deploy-production.sh`: SÍ hay backup automático
de Postgres (`pg_dump` antes de mutar, retiene los últimos 10), pero **solo
corre como parte de cada deploy a producción** — no es un cron independiente.
Si algo falla entre dos deploys, el RPO real es "desde el último deploy", no
"desde hace unos minutos". ¿Cómo documentamos el RPO?

- A. RPO = desde el último deploy (documentar el estado real, sin agregar nada nuevo)
- B. Agregar un backup programado (cron) independiente del deploy en esta etapa, para acotar el RPO
- X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
