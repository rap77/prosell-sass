# External Dependency Map — 260911-cross-org-export-ux

Sin dependencias externas identificadas para este intent. Todo el
trabajo (`bolt-cross-org-export-ux`, Units U1 y U2) es interno al
repositorio `prosell-sass`:

- Sin API externa nueva a integrar (el sistema del cliente es
  consumidor pasivo del CSV exportado, no un servicio a integrar).
- Sin aprobación de otro equipo requerida (equipo AI-only, ver
  `team-allocation.md`).
- Sin ventana de disponibilidad de datos — los datos ya existen en la
  base de datos de producción/staging.
- Sin hand-off de otro equipo — el pipeline CI/CD y el entorno de
  staging ya existen y están operativos (`ci.yml`, `deploy.yml`).

Este documento queda liviano/vacío de contenido bloqueante, per la
guía del stage file para el caso "fully AI-contained".
