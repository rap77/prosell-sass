# Escalation Matrix — Intent 260915-vehicle-catalog

## Resumen

Equipo chico, sin guardia formal rotativa documentada (Q2, confirmado por
el humano: "vos sos el único responsable hoy"). Esta matriz documenta el
estado REAL, no una estructura aspiracional de guardia que no existe.

## Matriz

| Severidad | Criterio                                                                       | Responsable primario                       | Escalamiento                     |
| --------- | ------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------- |
| SEV1      | Sitio caído completo (api o web no responde) — ver `dashboards.md`/healthcheck | El único responsable actual (sin rotación) | N/A — no hay segunda persona hoy |
| SEV2      | Degradación parcial (ej. decode-vin falla pero el resto funciona)              | El único responsable actual                | N/A                              |
| SEV3      | Warning de `field_key` sin catálogo (NFR-OBS-1) — bajo riesgo, sin urgencia    | Revisión manual cuando haya tiempo         | N/A                              |
| SEV4      | Cosmético / sin impacto de usuario                                             | Backlog                                    | N/A                              |

## Nota honesta (no aspiracional)

Sin canal de notificación dedicado a incidentes (Slack/PagerDuty) más allá
del webhook de "Deploy Staging OK" ya vigente (`deploy.yml`). Sin status
page pública. Si el equipo crece, esta matriz necesita revisarse — queda
fuera del alcance de este intent introducir esa infraestructura de
comunicación de cero.
