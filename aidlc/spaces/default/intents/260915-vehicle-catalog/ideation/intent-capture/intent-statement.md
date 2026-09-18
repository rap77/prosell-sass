# Intent Statement — Catálogo Canónico de Vehículos para Facebook

## Problem Statement

Las publicaciones y exports de vehículos no calzan de forma confiable con los valores canónicos de categoría/atributo de Facebook Marketplace, causando publicaciones rechazadas, mal categorizadas o de baja calidad [Q1]. Esto ocurre porque el mapeo al catálogo canónico de Facebook está implementado de forma inconsistente en distintas partes del sistema — schemas de categoría, selects dinámicos de formularios, decodificación de VIN, import/validación y registros legacy — generando riesgo de mantenimiento y drift [Q1]. Además de resolver el problema actual, esta iniciativa sienta las bases (referencias canónicas + contratos de adapter de publisher) para una futura integración de publicación directa con Facebook, sin activar automatización en vivo todavía [Q1][desc].

## Target Customer

- Administradores de dealership/organización que crean o importan publicaciones de vehículos y hoy reciben categorías/atributos incorrectos o rechazados al publicar en Facebook Marketplace [Q2].
- El equipo de ingeniería/producto que mantiene el mapeo del catálogo de Facebook, hoy duplicando o sincronizando a mano valores entre schemas de categoría, formularios, decodificación de VIN y validación [Q2].
- Compradores finales en Facebook Marketplace, que ven publicaciones incompletas o mal categorizadas [Q2].

## Success Metrics

- Cero (o casi cero) publicaciones de vehículos rechazadas o mal categorizadas por desajuste de valores del catálogo, después de publicar/exportar [Q3].
- Una única fuente canónica de verdad para los valores de vehículos de Facebook, consumida de forma consistente por schemas de categoría, selects dinámicos, decodificación de VIN y validación — medido por la eliminación de listas de valores duplicadas/hardcodeadas [Q3].
- Registros legacy de vehículos migrados exitosamente al catálogo canónico sin pérdida de datos — medido por tasa de finalización de migración / cantidad de registros reconciliados [Q3].

## Initiative Trigger

- Continuación de trabajo previo: un trabajo anterior ya introdujo un catálogo de valores de Facebook y un editor de schema, y esta iniciativa extiende esa referencia canónica de forma consistente a los puntos de contacto restantes que nombra la descripción inicial [Q4][desc].
- Un defecto de producción o incidente de calidad de datos vinculado a valores del catálogo de vehículos que necesita un fix durable, no solo un parche puntual [Q4].
- Una oportunidad próxima: preparar contratos de adapter de publisher de cara a una futura integración de publicación directa con Facebook, todavía sin alcance definido [Q4].

## Initial Scope Signal

- **Workflow-selected**: `feature` [scope].
- **Confirmado por el usuario**: el scope `feature` (profundidad Standard, con las etapas completas de inception + construction + operation) coincide con el límite de producto que tiene en mente para esta iniciativa; se mantiene así [Q8].

## Assumptions & Open Questions

None.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-15T11:18:10Z
**Iteration:** 1

### Findings

| #   | Severidad                          | Ubicación                                                        | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Recomendación                                                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor                              | `intent-statement.md` § Success Metrics                          | El Problem Statement y el Initiative Trigger citan explícitamente un tercer motivador — "sienta las bases (referencias canónicas + contratos de adapter de publisher) para una futura integración de publicación directa" [Q1][Q4][desc] — pero ninguna de las tres métricas de éxito (Q3 A/B/C) mide ese motivador. Las tres métricas cubren solo "cero publicaciones mal categorizadas", "fuente canónica única" y "migración legacy sin pérdida de datos"; no hay ningún criterio para "listo para integración futura".                                                                                                                                                                                                                                                                              | En Requirements Analysis, agregar un criterio de éxito explícito para el trabajo de contratos de adapter de publisher (ej. "contrato de adapter definido y documentado, sin necesidad de activar automatización en vivo"), o documentar explícitamente que ese motivador es de alcance informativo/preparatorio sin métrica de éxito propia. |
| 2   | Minor                              | `intent-statement.md` § Success Metrics, primer bullet           | "Cero (o casi cero)" no es una guía cuantificada — el guardrail de fase de Ideation exige que las métricas de éxito sean medibles y eviten resultados vagos. La cláusula "o casi cero" es exactamente el tipo de calificador ambiguo que ese guardrail busca evitar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | En Requirements Analysis, reemplazar por un umbral numérico concreto (ej. "≤X% de publicaciones rechazadas por desajuste de catálogo en un período de Y días") o, si el umbral exacto todavía no se puede fijar, marcarlo explícitamente como pendiente de definir en esa etapa.                                                             |
| 3   | Minor (informativo, no bloqueante) | `intent-statement.md` § Problem Statement / Initial Scope Signal | La descripción inicial [desc] enumera siete puntos de contacto técnicos distintos (schemas de categoría, selects dinámicos, decodificación de VIN, import/create/update de vehículos, defaults de ubicación/organización editables por producto, migración legacy, contratos de adapter de publisher) bajo un solo intent de scope `feature`. El usuario confirmó explícitamente en Q8 que el scope `feature` coincide y se mantiene así — no es un defecto del artefacto, que refleja fielmente la respuesta confirmada — pero dada la superficie amplia, vale la pena que Units Generation/Delivery Planning evalúen temprano si conviene descomponer en más de un Bolt dentro del mismo intent (patrón ya usado en el proyecto cuando piezas de trabajo no comparten archivo/función/ciclo de vida). | Ninguna acción sobre este artefacto — queda como nota de contexto para las etapas de diseño/planificación posteriores.                                                                                                                                                                                                                       |

### Verificación de trazabilidad de fuentes

Se verificó cada bloque sustantivo de `intent-statement.md` y `stakeholder-map.md` contra el registro `## Sources` y las respuestas `[Answer]:` de `intent-capture-questions.md`:

- Todos los tags `[desc]`, `[scope]`, `[Q1]`–`[Q8]` usados en ambos artefactos resuelven a una fuente real registrada o a una respuesta `[Answer]:` efectivamente marcada.
- Ninguna opción NO seleccionada (ej. Q1.D, Q2.D, Q4.C-opción-D, Q6.B/C, Q7.B/C, Q8.B/C/D) aparece como afirmación o exclusión en el contenido — se verificó línea por línea.
- Ambos artefactos contienen `## Assumptions & Open Questions` con `None.`, consistente con que el Consolidated Summary Confirmation fue `Looks correct` sin abrir ninguna pregunta de seguimiento.
- El "Initial Scope Signal" distingue correctamente `[scope]` (workflow-selected, `feature`) de `[Q8]` (confirmación del usuario), sin mezclarlos como si fueran la misma fuente — cumple el contrato de grounding del Step 5.3 de la etapa.
- Las 8 preguntas del archivo de preguntas están cubiertas en al menos uno de los dos artefactos (Q1→Problem Statement, Q2→Target Customer, Q3→Success Metrics, Q4→Initiative Trigger, Q5→Stakeholder Map, Q6→Stakeholder Map, Q7→Stakeholder Map + Communication Requirements, Q8→Initial Scope Signal) — ninguna respuesta quedó huérfana.
- No se detectaron afirmaciones de investigación de mercado sin cita — las afirmaciones sobre dolor del cliente/comprador final están atadas a respuestas humanas confirmadas (Q2), no a datos de mercado externos sin atribución.
- No se detectaron contradicciones internas entre Problem Statement, Success Metrics e Initiative Trigger, más allá del gap de cobertura de métrica señalado en el hallazgo #1.

### Summary

El artefacto está bien fundamentado: cada afirmación sustantiva tiene un tag de fuente resolvible, ninguna opción no elegida se coló como hecho, la distinción entre scope workflow-selected y scope confirmado por el usuario es correcta, y las 8 preguntas quedan cubiertas sin huérfanos. Los tres hallazgos son Minor — un gap de cobertura de métrica de éxito para el motivador de "preparación para integración futura", una métrica de éxito con calificador vago ("casi cero"), y una nota informativa sobre el tamaño de la superficie técnica dentro de un solo scope `feature` (ya confirmada explícitamente por el usuario, no un defecto de grounding). Ninguno bloquea el avance a la siguiente etapa; ambos primeros pueden resolverse naturalmente al cuantificar objetivos en Requirements Analysis.
