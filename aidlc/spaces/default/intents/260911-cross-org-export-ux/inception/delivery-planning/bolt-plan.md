# Bolt Plan — 260911-cross-org-export-ux

Un Bolt es una pasada de construcción sobre una o más Units de trabajo
(diseño + código + tests, terminando en algo desplegable). Este intent
tiene un único Bolt.

## Bolt 1 — `bolt-cross-org-export-ux`

- **Units incluidas**: U1 (`u1-cross-org-export-api`), U2
  (`u2-cross-org-export-ui`) — ver `unit-of-work.md`.
- **Walking skeleton**: No. `aidlc/spaces/default/memory/project.md` §
  Forbidden prohíbe la ceremonia para este proyecto (afirmado desde
  el intent `260829-nextjs-react-bump`); este Bolt es regular.
- **Definition of Done**:
  - Las 24 historias de `stories.md` (US1.1–US9.2) con sus criterios
    de aceptación verificados por test automatizado.
  - El piso mínimo de 6 puntos de test ya afirmado en
    `team-practices.md` § Testing Posture cubierto explícitamente.
  - Las 31 IDs de FR/NFR de `requirements.md` marcadas `OK` en el
    `traceability.json` de cada etapa de Construction que las toque.
  - Pipeline de pre-commit completo (GGA, secret scan, ruff/ruff-format,
    pyright, react-doctor, prettier/eslint) en verde.
  - Suite completa de tests (pytest backend + Vitest frontend) en
    verde en CI.
  - Deploy-on-merge a staging exitoso, con health check post-deploy
    (mismo camino ya afirmado en `org.md`/`team.md`).
- **Hipótesis de confianza**: si este Bolt se entrega, un Super Admin
  puede exportar el catálogo de TODAS las organizaciones en una sola
  descarga con datos correctos (sin columnas vacías ni mal
  transformadas), y el selector de organización del header realmente
  filtra lo que ve en `/catalog` — validando que el mecanismo de
  permisos cross-org ya existente (`ORG_ADMIN_VIEW_ALL`) escala de
  "una organización ajena" a "todas" sin abrir una brecha de seguridad
  nueva.
- **Demo esperada**: en staging, un usuario `super_admin` elige
  "Todas las organizaciones" en el selector del header, ve la grilla
  de `/catalog` actualizarse con productos de múltiples
  organizaciones, exporta el catálogo completo confirmando los 3
  popups secuenciales (nombre de archivo, carpeta base, grupos de
  Facebook), y el CSV resultante tiene las 8 columnas antes
  vacías/incorrectas ahora con valores reales — verificados contra
  `docs/data39.csv`.

## Secuencia interna del Bolt (dentro de la única pasada de Construction)

Orden de riesgo dentro del Bolt, per el riesgo principal identificado
por el humano (radio de explosión de "exportar todas"):

1. Chequeo de permiso `ORG_ADMIN_VIEW_ALL`/`super_admin` extendido al
   nuevo query param `all_organizations` (FR4.4, NFR2) — atacado
   primero porque es la superficie de mayor radio de explosión si
   falla.
2. Resolución batch de `org_code` por-producto (FR4.2) — el bug real
   ya detectado en el scan si se implementa ingenuamente.
3. Corrección de mapeo de columnas del CSV (FR7) — riesgo secundario
   (dato incorrecto silencioso, sin exposición de datos ajenos).
4. Resto de FR1/FR2/FR3/FR5/FR6/FR8/FR9 — superficie ya acotada por
   diseño (`refined-mockups/`, `contract-summary.md`).

Esta secuencia es técnica/de riesgo dentro del Bolt — no reordena las
Units entre sí (ambas siguen construyéndose en la misma pasada).
