# Evidence — 260915-vehicle-catalog

> Integración final (Step 5). Qué se inspeccionó, qué se infirió, y qué queda
> como incertidumbre sin resolver para etapas posteriores.

## Fuentes inspeccionadas

### Memory (línea base afirmada)

- `aidlc/spaces/default/memory/team.md` — leído completo. 5 secciones con
  contenido extenso de intents previos (`260829-*` en adelante): trunk-based +
  squash-merge + Conventional Commits (Way of Working); sin walking skeleton
  (Walking Skeleton); test-after, piso 40%/sin-piso-backend, y varios pisos de
  test puntuales por-intent ya cerrados (Testing Posture); deploy-on-merge +
  gate manual de prod (Deployment); Ruff+Pyright+ESLint+GGA (Code Style).
  Usado como baseline de referencia en las 5 secciones de `team-practices.md`.
- `aidlc/spaces/default/memory/project.md` — leído completo. `## Mandated`/`## Forbidden`
  ya estampados con las mismas 7 reglas duras (Conventional Commits,
  squash-merge, pipeline pre-commit completo, suite pytest en pre-push/CI,
  confirmación manual de deploy, manejo de errores centralizado frontend,
  corregir hallazgos de GGA en archivos tocados) — ninguna contradice ni
  necesita especialización para este intent. `## Corrections` tiene ~90+
  aprendizajes de intents previos; los tres más recientes y relevantes a esta
  etapa puntual (multiSelect + 4 opciones para AskUserQuestion, verificar
  ancho de diagramas ASCII, veredicto NARROWER de Reverse Engineering es
  mecánico) son de ESTE MISMO intent (260915-vehicle-catalog), de etapas
  anteriores (intent-capture, feasibility, rough-mockups, reverse-engineering).

### Reverse Engineering (evidencia de código, brownfield)

- `aidlc/spaces/default/codekb/prosell-sass/code-quality-assessment.md` —
  leído completo (209 líneas). Sección específica de este intent: "Hallazgos
  del scan enfocado `260915-vehicle-catalog`" (hallazgos #87-93). Los 7
  hallazgos citados textualmente en `team-practices.md`:
  - **#87 (central)**: dos catálogos de valores de Facebook incompatibles
    (`nhtsa_normalizer.py` inglés/minúscula vs. `facebook-values/index.ts`
    español), sin reconciliación runtime — `VinDecodeField.tsx` asume que
    calzan.
  - **#89/#91**: `FACEBOOK_FIELD_KEY_MAP` mantenido a mano, sin test de
    sincronización con `facebook-values/index.ts`.
  - **#90**: `MIGRATE_VEHICLES_README.md` posiblemente obsoleto — solo
    skimmed, no confirmado.
  - **#92**: migraciones legacy de vehículos ad-hoc, sin framework
    reutilizable.
  - **#93 (confirmación positiva)**: `IPublisherService`/`PublisherStrategySelector`
    ya existen en producción — el contrato de adapter de publisher NO se
    diseña de cero.
  - Hallazgos previos relevantes de intents anteriores también revisados por
    completitud (#25/#26 fallback silencioso de `cod_organization`; #60/#61
    discrepancia de columnas del CSV cliente; #80 mapeo de valor vs. clave del
    CSV cliente; #86 patrón UX de `window.prompt()`).
- `<record>/inception/reverse-engineering/memory.md` — leído completo.
  Confirma que el hallazgo #87 fue señalado explícitamente por el developer
  como candidato a pregunta central de Requirements Analysis, no resuelto en
  esta etapa.
- `technology-stack.md`, `dependencies.md`, `architecture.md`,
  `business-overview.md`, `code-structure.md` — revisados por títulos/secciones
  (no hubo mención adicional específica de vehículo/VIN/Facebook fuera de lo
  ya cubierto en `code-quality-assessment.md`); no se encontró evidencia nueva
  de práctica de equipo en esos archivos que no estuviera ya en
  `code-quality-assessment.md` o en el `team.md` ya afirmado.

### Revisión ciega (Step 3) — qué inspeccionó cada participante

- **`aidlc-quality-agent`**: inspeccionó el piso de 4 puntos propuesto en el
  draft original de § Testing Posture contra los hallazgos #87-93 de
  `code-quality-assessment.md` y contra el rigor ya exigido en el precedente
  `260911-cross-org-export-ux` (Q1, valor de entrada fijo → valor de salida
  exacto). No leyó código fuente directamente — trabajó sobre el draft y el
  scan.
- **`aidlc-developer-agent`**: verificó código real, no solo el scan —
  `apps/api/src/prosell/infrastructure/services/nhtsa_normalizer.py`,
  `apps/api/src/prosell/domain/services/category_translation.py`,
  `apps/web/src/lib/i18n/facebook-values/index.ts`,
  `apps/web/src/components/admin/category-schema-editor.tsx`, y
  `apps/web/src/components/forms/schema/VinDecodeField.tsx`. Confirmó
  carácter-a-carácter que las tres representaciones de `FacebookValue`
  (`key`/`es`/`en`) no calzan con los tokens de `NHTSA_TO_FACEBOOK`, y que
  el comentario inline citado en el hallazgo #87 es real, no una
  interpretación del scan.
- **`aidlc-devsecops-agent`**: inspeccionó el código real de
  `IPublisherService` (`apps/api/src/prosell/domain/ports/i_publisher_service.py`)
  y sus tres adapters, más `build_client_format_row()`
  (`csv_export.py:246`) y el writer real de
  `export_catalog_client_format.py:467` (`csv.writer` estándar de Python).
  Confirmó por `grep` que ninguno de los tres adapters loguea hoy
  `access_token`.

### Correcciones objetivas aplicadas directo (verificadas por los revisores, sin re-preguntar al humano)

1. **Credencial de mayor alcance del adapter Playwright (devsecops)**: el
   `access_token: str` que reciben `publish`/`update`/`delete` de
   `IPublisherService` no es un token genérico — para el adapter de
   Playwright es, según su propio docstring
   (`playwright_publisher.py:76`), "Facebook session cookies JSON string
   (Phase 1)": una credencial de mayor alcance que un token OAuth de
   página. Corregido en `team-practices.md` § Deployment.
2. **Granularidad real del mismatch #87, y boundary backend/frontend de la
   reconciliación (developer)**: la desalineación de catálogos no es solo
   inglés vs. español — es un mismatch valor-por-valor verificado
   carácter a carácter (casing y forma exacta distintos incluso dentro de
   la representación `en`). Además, el origen real del token
   (`NHTSA_TO_FACEBOOK`) es un archivo BACKEND (`nhtsa_normalizer.py`), no
   frontend — la guía de Code Style original del draft asumía
   implícitamente un problema frontend-only. Corregido en
   `team-practices.md` § Code Style, presentando ambas alternativas
   (backend domain service vs. tabla TS compartida) para que Functional
   Design decida.

### Nota abierta para Functional Design (developer, no resuelta en esta etapa)

`nhtsa_normalizer.py` (283 líneas, cero imports, dict puro) tiene la misma
forma "cero dependencias externas" que `category_translation.py`, pero
mientras este último vive correctamente en `domain/services/` (con
docstring citando la regla del proyecto "Domain layer has ZERO external
dependencies"), `nhtsa_normalizer.py` vive en `infrastructure/services/` —
inconsistencia de ubicación de capa preexistente, no introducida por este
intent. No hace falta que este intent la corrija, pero es directamente
relevante para decidir dónde ubicar la reconciliación nueva entre los dos
catálogos de valores (hallazgo #87): agregar código nuevo junto a una pieza
ya mal ubicada arriesga perpetuar la inconsistencia. Queda documentada acá
para que Functional Design la tenga presente al decidir dónde vive la
reconciliación.

## Incertidumbre resuelta en la entrevista (Step 4)

1. **Piso de test de § Testing Posture**: afirmado tal cual (Q1: "Sí,
   afirmar los 6 puntos tal cual"), incluyendo los 2 gaps que señaló QA
   (#89/#91 y #88) y la corrección de QA sobre `validate_attributes()`
   (necesita input/output fijados, no un test de humo). Ver
   `team-practices.md` § Testing Posture.
2. **Riesgo de CSV/formula injection señalado por devsecops**: afirmado
   agregar sanitización de fórmulas al export CSV como parte de este intent
   (Q2: "Sí, agregar sanitización... ya que se está tocando ese mapeo de
   valores"). Ver `team-practices.md` § Deployment.

## Incertidumbre sin resolver (candidatos para stages posteriores)

1. **¿La reconciliación de los dos catálogos de valores (#87) se resuelve
   en el backend (domain service, recomendación de developer) o con una
   tabla TS compartida en el frontend?** — decisión de arquitectura para
   Functional Design, no de esta etapa; ambas alternativas quedan
   documentadas en `team-practices.md` § Code Style.
2. **¿Las migraciones legacy ad-hoc (#92) se generalizan en este intent, o
   quedan fuera de alcance?** — determina si el piso de test #5 de
   `team-practices.md` aplica o no. Requirements Analysis debe decidirlo.
3. **`MIGRATE_VEHICLES_README.md` (#90) — ¿sigue siendo accionable o está
   completamente obsoleto?** Solo hubo skim, no lectura completa; no se
   resuelve en esta etapa.
4. **Ubicación de capa de `nhtsa_normalizer.py`** (ver nota abierta arriba)
   — Functional Design debe tenerla presente al decidir dónde vive la
   reconciliación nueva, sin que este intent esté obligado a corregirla.
5. Sin hallazgo de restricción DURA de proceso de equipo nueva confirmada en
   la entrevista — `discovered-rules.md` § Mandated/Forbidden queda sin
   promociones nuevas para este intent.

## Participantes (Step 3, ya corridos)

- `aidlc-quality-agent`, `aidlc-developer-agent`, `aidlc-devsecops-agent` —
  revisión ciega en paralelo contra el draft del lead, cada uno sin
  visibilidad de las otras dos contribuciones. Ver arriba "Revisión ciega
  (Step 3) — qué inspeccionó cada participante" para el detalle de qué
  inspeccionó cada uno.
