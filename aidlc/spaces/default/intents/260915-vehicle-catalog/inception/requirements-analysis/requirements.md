# Requirements — Catálogo Canónico de Vehículos para Facebook

Basado en `intent-statement.md`, `scope-document.md`, `team-practices.md` (Practices Discovery), `aidlc/spaces/default/codekb/prosell-sass/business-overview.md`, `architecture.md`, `code-structure.md`, y las 7 respuestas de `requirements-analysis-questions.md`.

## Intent Analysis

El objetivo de fondo es que el catálogo de vehículos de la plataforma use, de punta a punta, los mismos valores canónicos que exige Facebook Marketplace — hoy dos catálogos distintos (uno para decodificar el VIN, otro para las opciones de los formularios) no calzan entre sí, y esa desalineación es silenciosa. Resolverlo bien deja además la base lista (contrato de publisher ya documentado, defaults de ubicación consistentes) para una futura integración de publicación directa, sin activarla todavía.

## Functional Requirements

### FR1 — Reconciliación de catálogos de valores de Facebook

- **FR1.1**: El endpoint de decodificación de VIN devuelve, para cada campo select-backed relevante (marca, tipo, combustible, tracción, etc.), un valor ya reconciliado contra el catálogo canónico de opciones del schema — la reconciliación vive como domain service en el backend (Q1), no como una tabla duplicada en el frontend.
- **FR1.2**: Cuando el valor decodificado no tiene una opción correspondiente en el catálogo canónico, ese campo específico queda vacío para que el usuario lo complete a mano; el resto del formulario no se bloquea (Q2).
- **FR1.3**: `Category.validate_attributes()` valida el valor ya reconciliado (no el valor crudo que devuelve NHTSA) contra las opciones configuradas del schema. Cuando el valor (típicamente tipeado a mano, no proveniente del decode de VIN) no calza con ninguna opción configurada, se rechaza con error y no se permite guardar el vehículo — mismo comportamiento ya vigente hoy, sin cambios (Q8, opción A).
- **FR1.4**: La sincronización entre `FACEBOOK_FIELD_KEY_MAP` (editor de schema) y el catálogo de valores de Facebook deja de depender de dos archivos mantenidos a mano sin verificación cruzada — Functional Design define el mecanismo concreto (fuente única de verdad), con el piso de test #3 de `team-practices.md` como criterio de aceptación.

### FR2 — Defaults de ubicación por producto

- **FR2.1**: El usuario puede editar y persistir una ubicación específica para un producto individual, sobrescribiendo el default heredado de la organización (Q5, opción C).
- **FR2.2**: El override de ubicación por producto se aplica en creación y edición de producto — no solo en el momento de exportar, que es el único lugar donde existe el fallback hoy.
- **FR2.3**: El export de catálogo sigue resolviendo la ubicación con la misma prioridad ya implementada (override del producto si existe, si no la ubicación de la organización), sin cambio de comportamiento en ese flujo.

### FR3 — Migración de registros legacy al catálogo canónico

- **FR3.1**: Este intent migra los registros de vehículos legacy que hoy no cumplen el catálogo canónico de valores de Facebook — es uno de los 4 grupos Must Have confirmados en `scope-document.md`. La migración se implementa ad-hoc (no como herramienta reutilizable, Q3 opción B), con las mismas guardas de seguridad triples ya usadas en las migraciones de referencia (validación de producto, categoría, y existencia antes de aplicar).

### FR4 — Contrato de adapter de publisher (documentación, sin cambio de contrato)

- **FR4.1**: Documentar el contrato existente de `IPublisherService` (`publish`/`update`/`delete`) y sus tres adapters concretos (`playwright_publisher.py`, `graph_api_publisher.py`, `null_graph_api_publisher.py`) como parte del trabajo de este intent, sin modificar el contrato (Q4, opción A) — no se activa automatización en vivo. La documentación debe capturar explícitamente que el parámetro `access_token` no es un token genérico de una sola clase: para el adapter de Playwright es en realidad session cookies (credencial de mayor alcance que un token de página) — para que un futuro intent que sí extienda el puerto herede esa distinción en vez de tratar el parámetro solo por su firma.

### FR5 — Sanitización del export CSV contra inyección de fórmulas

- **FR5.1**: Cualquier valor de celda del CSV cliente que empiece con `=`, `+`, `-` o `@` se prefija con comilla simple (`'`) antes de escribirse al archivo, neutralizando su interpretación como fórmula en Excel/Google Sheets sin cambiar el valor visible para el cliente (Q6, opción A).

## Non-Functional Requirements

- **NFR1** (Correctness / calidad de dato): 0% de vehículos con un valor de atributo sin reconciliar contra el catálogo canónico de Facebook, sin margen (Q7, opción A). Medido dentro de este intent por el test de reconciliación cruzada valor-por-valor de FR1.1/FR1.4 (piso de test #1 y #3 de `team-practices.md`), cubriendo el 100% de los campos select-backed de la taxonomía de vehículos (no una muestra parcial), más una revisión manual de QA sobre esos mismos campos antes de mergear — no por observar rechazos reales de Facebook, ya que la automatización en vivo de publicación permanece fuera de alcance.
- **NFR2** (Testing): piso mínimo de 6 tests afirmado en Practices Discovery (`team-practices.md` § Testing Posture) — reconciliación cruzada valor-por-valor, `validate_attributes()` con caso concreto, sincronización `FACEBOOK_FIELD_KEY_MAP`, tabla de traducción de categorías, y — condicionalmente — regresión de migración legacy y wiring del adapter de publisher.

## Constraints

- Stack tecnológico existente (FastAPI + SQLAlchemy + Postgres backend, Next.js + React + TypeScript frontend) — sin herramienta o librería nueva.
- Sin cambio de infraestructura ni de topología de despliegue (droplet self-hosted, Docker + GitHub Actions).
- La automatización en vivo de publicación en Facebook permanece fuera de alcance — FR4 es documentación del contrato existente, no su activación.

## Assumptions

- Los tres adapters concretos de publisher (`playwright_publisher.py`, `graph_api_publisher.py`, `null_graph_api_publisher.py`) no requieren cambio de comportamiento — FR4 solo documenta, no modifica el contrato.
- `category_translation.py` (domain service puro, sin dependencias externas) sigue siendo el patrón de referencia de capa para la nueva reconciliación de catálogos de FR1 — Functional Design decide la ubicación exacta, con la inconsistencia de capa de `nhtsa_normalizer.py` (hoy en `infrastructure/services/`) documentada como nota abierta en `evidence.md` de Practices Discovery.

## Out of Scope

- Generalización de la herramienta de migración de datos legacy (FR3.1, Q3 opción B).
- Extensión del contrato de `IPublisherService` (FR4.1, Q4 opción A) — solo documentación.
- Activación de automatización en vivo de publicación en Facebook (ya excluido desde Intent Capture).
- Corrección de `MIGRATE_VEHICLES_README.md` (posible doc obsoleta, hallazgo #90) — no confirmado ni corregido en este intent.

## Open Questions

- Mecanismo exacto de sincronización entre `FACEBOOK_FIELD_KEY_MAP` y el catálogo de valores (FR1.4) — Functional Design debe elegir la implementación concreta (fuente única de verdad compartida vs. otro mecanismo de validación cruzada).
- `MIGRATE_VEHICLES_README.md` — si sigue siendo accionable o es código/doc muerta; no bloqueante para este intent.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-16T10:21:02Z
**Iteration:** 1

### Hallazgos previos — verificación de resolución

| #   | Severidad original | Hallazgo                                                                                                                                 | Estado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Critical           | FR3.1 dejaba la migración legacy condicional ("si hiciera falta"), contradiciendo el Must Have de `scope-document.md`.                   | **Resuelto.** FR3.1 ahora dice sin condicional: "Este intent migra los registros de vehículos legacy que hoy no cumplen el catálogo canónico de valores de Facebook — es uno de los 4 grupos Must Have confirmados en `scope-document.md`". Verificado contra `scope-document.md` § In Scope (grupo 3, "Migración de registros legacy al catálogo canónico") y § Minimum Viable Scope ("el conjunto completo de los 4 grupos — no se recorta ninguno") — ya no hay contradicción. La respuesta B de Q3 ("no generalizar en herramienta reutilizable") queda correctamente acotada a la decisión de implementación (ad-hoc vs. framework reutilizable), no a si la migración ocurre — coherente con `## Out of Scope` ("Generalización de la herramienta de migración de datos legacy (FR3.1, Q3 opción B)"), que ya no reclama la migración en sí como fuera de alcance. El criterio de qué registros migra ("los que hoy no cumplen el catálogo canónico") es suficientemente preciso para que un desarrollador identifique el conjunto mediante query, sin necesitar un conteo fijo de antemano. |
| 2   | Major              | NFR1 (0% sin margen) no era medible dentro del alcance del intent, dado que la automatización en vivo de Facebook está fuera de alcance. | **Resuelto.** NFR1 ahora especifica el mecanismo de medición explícitamente dentro del alcance real del intent: "Medido dentro de este intent por el test de reconciliación cruzada valor-por-valor de FR1.1/FR1.4 ... y por muestreo manual de QA antes de mergear — no por observar rechazos reales de Facebook". Ya no depende de un canal de publicación en vivo inexistente en este intent. Queda un criterio testeable: el test de reconciliación cubre el catálogo (pass/fail claro), y el muestreo de QA cubre los datos migrados.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3   | Major              | FR1.3 no especificaba qué pasa cuando `validate_attributes()` rechaza un valor.                                                          | **Resuelto.** Se agregó la pregunta de seguimiento Q8 ("¿qué debería pasar hoy en creación/edición de vehículo?"), respondida A ("Rechazar con error — comportamiento actual, sin cambios") y confirmada en la Consolidated Summary Confirmation. FR1.3 ahora dice explícitamente: "se rechaza con error y no se permite guardar el vehículo — mismo comportamiento ya vigente hoy, sin cambios (Q8, opción A)". QA ya tiene el input/output concreto que el piso de test #2 de `team-practices.md` exige.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | Minor              | NFR2 (manejo de `access_token`) no tenía superficie real de aplicación dado que FR4 es solo documentación.                               | **Resuelto.** NFR2 fue removido como NFR independiente y su contenido se replegó dentro de FR4.1 como requisito de documentación: "La documentación debe capturar explícitamente que el parámetro `access_token` no es un token genérico de una sola clase... para que un futuro intent que sí extienda el puerto herede esa distinción". Ya no presupone una interacción de código nuevo con `IPublisherService` que este intent no tiene.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Las cuatro correcciones son sustantivas, no cosméticas — cada una cierra el hueco de fondo señalado en la pasada anterior, no solo reformula la superficie del texto.

### Verificación de trazabilidad (8 preguntas, incluida Q8)

- Q1→FR1.1, Q2→FR1.2, Q3→FR3.1 (y § Out of Scope), Q4→FR4.1, Q5→FR2.1-2.3, Q6→FR5.1, Q7→NFR1, Q8→FR1.3. Sin huérfanos.
- No hay opciones no elegidas coladas como hecho (Q3-A "generalizar", Q4-B "extender contrato", Q6-B "rechazar/loguear", Q8-B "permitir y loguear" no aparecen afirmadas en ningún FR).
- IDs `FR{n}`/`FR{n}.{m}`/`NFR{n}` son estables y no se repiten.
- `## Consolidated Summary Confirmation` incluye las 8 preguntas y está confirmada ("Looks correct").

### Hallazgos nuevos

| #   | Severidad | Ubicación                   | Hallazgo                                                                                                                                                                                                                                        | Recomendación                                                                                                                                                                                                                                                                |
| --- | --------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor     | Non-Functional Requirements | Tras remover NFR2, la sección queda con NFR1 y NFR3 (sin NFR2) — un salto de numeración no explicado. No es ambiguo ni bloqueante (los IDs no necesitan ser consecutivos), pero puede leerse como una omisión accidental en una lectura rápida. | Opcional: agregar una nota breve ("NFR2 se repliega en FR4.1") o renumerar NFR3→NFR2 si se prefiere numeración consecutiva — cosmético, no bloquea Construction.                                                                                                             |
| 2   | Minor     | NFR1                        | El "muestreo manual de QA antes de mergear" no fija un tamaño de muestra ni un criterio de cobertura mínima — queda como proceso cualitativo complementario al test automatizado (que sí es un criterio pass/fail claro).                       | Opcional para Build and Test: si se quiere que el muestreo sea auditable, fijar un tamaño mínimo (ej. "todos los registros migrados con menos de N" o "10% aleatorio") — no bloquea esta etapa porque el criterio automatizado ya es suficiente para un veredicto pass/fail. |

### Summary

Las cuatro correcciones de la pasada anterior son reales y verificadas contra las fuentes upstream (`scope-document.md`, `team-practices.md`, la nueva Q8): la contradicción Critical con el Must-Have de migración legacy queda cerrada sin condicionales, el NFR1 ahora tiene un mecanismo de medición dentro del alcance real del intent, FR1.3 fija el comportamiento de rechazo con respaldo de una pregunta de seguimiento explícita, y NFR2 quedó correctamente replegado como requisito de documentación en FR4.1. Las 8 preguntas trazan sin huérfanos y sin opciones no elegidas coladas como hecho. Los dos hallazgos nuevos son cosméticos (numeración de NFR, falta de tamaño de muestra en un proceso manual complementario) y no impiden que un desarrollador implemente sin volver a preguntar. El artefacto está listo.
