# Initiative Brief — Reverse Engineering Documental (ProSell SaaS)

**Intent**: 260824-reverse-eng-docs
**Scope**: reverse-engineering-docs (custom, Minimal)
**Fecha**: 2026-08-24

## Sources

Este intent saltea `intent-capture` y `scope-definition` (Ideation), así que este brief no consume un `intent-statement`, `stakeholder-map`, `scope-document` ni `intent-backlog` generados en esta corrida — en su lugar empaqueta directamente los equivalentes ya existentes en `Product-Definition/`, tal como quedó acordado en el gate de composición del plan:

- **`intent-statement` / `stakeholder-map` (sustituidos)**: `Product-Definition/vision-document.md` §1-2 ("Problem Statement", "Target Users").
- **`scope-document` / `intent-backlog` (sustituidos)**: `Product-Definition/vision-document.md` §6-7 ("Scope — What's IN/OUT").
- **`competitive-analysis` (no aplica — market-research SKIP)**: `Product-Definition/vision-document.md` §5 ("Competitive Landscape") ya cubre el panorama competitivo; no se generó market research nuevo para este intent documental.
- **`feasibility-assessment` / `constraint-register` (no aplica — feasibility SKIP)**: `Product-Definition/vision-document.md` §8-9 ("Key Constraints", "Key Risks").
- **`team-assessment` (no aplica — team-formation SKIP)**: confirmado en Q4 de `approval-handoff-questions.md` — developer solo, sin mob que coordinar.
- **`wireframes` (no aplica — rough-mockups SKIP)**: no hay trabajo de UI en este intent.

## 1. Intent y Problema

**Qué se va a hacer**: reverse engineering puramente documental del monorepo `prosell-sass` — mapear el código real (backend FastAPI + frontend Next.js) y volcarlo en documentación en español, sin tocar ni una línea de código de producción.

**Por qué**: `Product-Definition/vision-document.md` ya resolvió el problema de negocio, los usuarios objetivo y la visión de producto para ProSell SaaS (marketplace + CRM híbrido multi-canal). Lo que falta es la contraparte de ingeniería: documentación fiel al estado real del código, para sostener el trabajo futuro sin depender de la memoria del developer solo.

**Alcance confirmado (Q1)**: reverse engineering documental, sin cambios de código, usando `Product-Definition/` como base de negocio — confirmado tal cual estaba planteado.

## 2. Validación de Mercado

No se generó market research nueva para este intent (stage `market-research` en SKIP — IAE=0.20, bajo el umbral). `Product-Definition/vision-document.md` §5 ya documenta el panorama competitivo (AutoTrader/CarGurus, Frazer DMS, herramientas nativas de Facebook, Dealersocket) y la posición de ProSell como alternativa liviana para dealers chicos. No hay nada que este intent deba agregar en materia de mercado — es documentación técnica, no una decisión de producto.

## 3. Feasibility y Riesgos

No se corrió una evaluación de feasibility nueva (stage `feasibility` en SKIP — es documentación de lo que ya existe, no una construcción a evaluar). Los riesgos clave siguen siendo los de `Product-Definition/vision-document.md` §9:

| Riesgo                                                | Probabilidad | Impacto | Mitigación                                                      |
| ----------------------------------------------------- | ------------ | ------- | --------------------------------------------------------------- |
| Cambios de política/API de Facebook rompen publishing | Media        | Alto    | Enfoque de calibración guiada (human-in-loop)                   |
| Burnout del developer solo                            | Media        | Crítico | Metodología AIDLC + desarrollo asistido por IA                  |
| Mercado muy competitivo (AutoTrader, etc.)            | Baja         | Media   | Segmento distinto (dealers chicos, multi-plataforma, accesible) |
| Demora en mobile-first bloquea adopción               | Alta         | Alto    | Priorizado en Sprint 0                                          |

**Confirmado en Q3**: no hay riesgo crítico adicional específico de este trabajo de documentación — los 4 riesgos ya listados cubren lo relevante.

**Pendiente conocido (Q2)**: `Product-Definition/open-questions.md` deja OQ-10 (plan de backup/disaster recovery) como TBD, para la fase de Operación de AIDLC. No bloquea este intent — queda anotado como deuda para cuando corresponda.

## 4. Límite de Alcance

**Dentro**: barrido documental completo y parejo sobre todo el monorepo (`apps/api` + `apps/web`), sin foco especial en ningún módulo (confirmado en Q5).

**Fuera**: cualquier cambio de código, cualquier decisión de producto o de mercado nueva — este intent es puramente de documentación de lo que ya existe.

## 5. Conceptos Visuales

No aplica — no hubo etapa de `rough-mockups` (sin trabajo de UI nuevo en este intent).

## 6. Plan de Equipo

Developer solo (confirmado en Q4). Sin mob que coordinar, sin plan de staffing — este intent lo ejecuta una sola persona con asistencia de IA, consistente con `Product-Definition/vision-document.md` §8 ("Solo developer").

## 7. Recomendación Go/No-Go

**GO.** El alcance es acotado (documentación, sin riesgo de romper producción), la base de negocio ya está resuelta en `Product-Definition/`, y el único pendiente (OQ-10) no bloquea. Se avanza directamente a la etapa de Reverse Engineering (2.1).

## Assumptions & Open Questions

- **[assumption]** El barrido documental cubre `apps/api` y `apps/web` por igual, sin priorizar ningún módulo — confirmado en Q5.
- **[Q2]** OQ-10 (backup/disaster recovery) queda como deuda documentada, a resolver en la fase de Operación de AIDLC — no bloquea este intent.

None.
