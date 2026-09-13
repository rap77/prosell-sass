# Delivery Planning — Preguntas (260911-cross-org-export-ux)

Un Bolt es una pasada de construcción sobre una o más Units de trabajo
(un build completo que termina en algo funcionando). Las preguntas
estratégicas de esta etapa ya están resueltas por decisiones tomadas
en etapas previas:

- **Way of Working**: trunk-based, squash-merge (`team.md`, sin
  especialización nueva para este intent).
- **Walking Skeleton**: NEVER se corre la ceremonia (`project.md`
  § Forbidden, afirmado desde 260829) — el primer Bolt es un Bolt
  regular, no una porción mínima end-to-end.
- **Bundling de Units en un solo Bolt**: `team-practices.md` § Way of
  Working ya reconfirma el precedente `260903-catalog-client-export` —
  ninguna de las dos Units (U1 backend, U2 frontend) entrega valor de
  usuario independiente por sí sola (el fix de mapeo de CSV sin la UI
  del selector no resuelve el dolor real reportado por el usuario, y
  viceversa). **Un solo Bolt, bundleando U1+U2.**
- **Scoring formal (WSJF)**: no aplica — con un solo Bolt candidato no
  hay nada que rankear entre sí.
- **Paralelismo entre Bolts**: no aplica — un solo Bolt.
- **Dependencias externas**: ninguna identificada — todo el trabajo es
  interno al repo, sin API externa, sin aprobación de otro equipo, sin
  ventana de disponibilidad de datos.

## Pregunta genuina: qué nos preocupa más de este build

```question
prompt: "¿Qué te preocupa más de este build, para asegurarnos de que el Bolt lo ataque temprano dentro de su propia secuencia interna?"
header: "Riesgo principal"
multiSelect: false
options:
  - label: "A. El radio de explosión de \"exportar todas\" (Recommended)"
    description: "Un fallo del chequeo de permiso o un bug de resolución de org_code expone datos de TODA la plataforma en una sola descarga — ya mitigado con auditoría distinguible + confirmación reforzada, pero es el punto de mayor impacto"
  - label: "B. La corrección de mapeo de columnas del CSV"
    description: "Un valor mal transformado se entrega silenciosamente al sistema externo del cliente sin que nadie lo note"
  - label: "X. Other (please specify)"
    description: "Otra preocupación"
```

[Answer]: A. El radio de explosión de "exportar todas"

## Plan Summary (pre-generation)

**1 Bolt**: `bolt-cross-org-export-ux`

- **Units incluidas**: U1 (`u1-cross-org-export-api`), U2
  (`u2-cross-org-export-ui`).
- **¿Walking skeleton?**: No — `project.md` prohíbe la ceremonia para
  este proyecto; este es un Bolt regular.
- **Definition of Done**: las 24 historias de `stories.md` con sus ACs
  verificados por test (piso mínimo de 6 puntos ya afirmado en
  `team-practices.md`); las 31 IDs de FR/NFR de `requirements.md`
  cubiertas `OK` en `traceability.json` de cada etapa de Construction;
  pipeline de pre-commit (GGA, ruff, pyright, prettier, eslint) y
  suite completa (pytest + Vitest) en verde; deploy-on-merge a
  staging exitoso con health check post-deploy.
- **Hipótesis de confianza**: si este Bolt se entrega, un Super Admin
  puede exportar el catálogo de TODAS las organizaciones en una sola
  descarga con datos correctos (sin columnas vacías/mal transformadas),
  y el selector del header realmente filtra lo que ve en `/catalog` —
  validando que el mecanismo de permisos cross-org ya existente
  (`ORG_ADMIN_VIEW_ALL`) escala de "una organización ajena" a "todas"
  sin nuevas brechas de seguridad.
- **Demo esperada**: en staging, un usuario `super_admin` elige "Todas
  las organizaciones" en el selector, ve la grilla de `/catalog`
  actualizarse con productos de múltiples organizaciones, exporta el
  catálogo completo (confirmando los 3 popups: nombre de archivo,
  carpeta base, grupos de Facebook), y el CSV resultante tiene las 8
  columnas antes vacías/incorrectas ahora con valores reales,
  verificados contra `docs/data39.csv`.
- **Mob que lo ejecuta**: `aidlc-developer-agent` (Team Formation fue
  SKIP — scope `classic` — default ya establecido en el stage file).

## Pre-generation Summary

- 1 Bolt, bundleando U1+U2, sin walking skeleton.
- Riesgo principal identificado: radio de explosión de "exportar
  todas" (ya mitigado en diseño con auditoría distinguible y
  confirmación reforzada).
- Sin dependencias externas ni oportunidad de paralelismo entre Bolts
  (solo hay uno).

Does this all look correct before I generate the delivery planning artifacts?

```question
prompt: "Does this all look correct before I generate the delivery planning artifacts?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá los artefactos"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar"
```

[Answer]: Looks correct

## Consolidated Summary Confirmation

- 1 Bolt (`bolt-cross-org-export-ux`), bundleando U1+U2, sin walking skeleton.
- Phase Boundary Verification: PASS (0 GAP/ORPHAN en los 2 traceability.json de Inception).
- 1 aprendizaje persistido (omitir WSJF/paralelismo con un solo Bolt candidato).

Does this all look correct before closing the Delivery Planning stage (and Inception)?

```question
prompt: "Does this all look correct before closing the Delivery Planning stage (and Inception)?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, cerrar la etapa y la fase Inception"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de cerrar"
```

[Answer]: Looks correct
