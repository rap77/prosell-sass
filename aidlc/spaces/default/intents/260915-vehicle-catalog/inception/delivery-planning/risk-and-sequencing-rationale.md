# Risk & Sequencing Rationale — Catálogo Canónico de Vehículos para Facebook

## Por qué un solo Bolt

Ninguna de las 2 Units (`unit-of-work.md`) entrega valor de usuario demostrable de forma completamente independiente: U1 (backend) no tiene superficie de usuario propia, y la porción de U2 que cubre US1.1/US1.2 necesita el contrato de U1 para completarse end-to-end (`unit-of-work-dependency.md`). Con un solo par de Units y sin walking skeleton (`aidlc/spaces/default/memory/project.md` § Forbidden), no hay más de un Bolt candidato — no se aplicó scoring formal (WSJF u otro), porque el scoring solo aporta valor cuando hay múltiples Bolts candidatos compitiendo por orden (mismo criterio ya usado en el intent `260911-cross-org-export-ux` de este proyecto).

## Orden interno del Bolt: riesgo-primero, no topología pura

Aunque la topología (`unit-of-work-dependency.md`) solo exige que U1 exista antes de que la porción de U2 dependiente pueda completarse, el orden interno elegido va un paso más allá por una razón de riesgo, no de dependencia estricta: **construir y testear la reconciliación backend (`FacebookVehicleValueCatalog`, FR1.1/FR1.4) ANTES que la UI de U2**, confirmado en la entrevista (riesgo principal).

**Motivo**: el hallazgo central que originó este intent (#87 del scan de código) es exactamente un catálogo de valores con huecos de cobertura que nadie detectó hasta que el mismatch llegó a producción — un mismatch silencioso. Si se construyera la UI primero (o en paralelo sin el test de reconciliación ya en verde), un hueco de cobertura del catálogo se vería recién como un campo vacío en pantalla, sin señal clara de si es un bug de UI o un hueco real del catálogo. Con el test de reconciliación cruzada valor-por-valor (piso de test #1 de `team-practices.md`) corriendo primero y en verde, cualquier hueco aparece como una falla de test explícita, con el campo/valor exacto que falta — mismo nivel de rigor que NFR1 exige ("0% sin margen").

**Heurística usada**: riesgo-primero (Reinertsen, reducción de incertidumbre antes de construir sobre una base no verificada) — no es WSJF formal (no hay múltiples Bolts para rankear), y no es value-first puro (la UI es donde vive el valor visible para el usuario, pero se pospone deliberadamente para no construir sobre un catálogo no verificado).

## Riesgos identificados y mitigación

| Riesgo                                                                                           | Mitigación                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FacebookVehicleValueCatalog` con huecos de cobertura (valor real de NHTSA sin entrada canónica) | Test de reconciliación cruzada (piso #1) construido y verificado ANTES de la UI — ver orden interno arriba.                                                              |
| Migración legacy (FR3.1) toca datos de producción existentes                                     | Guardas de seguridad triples ya usadas en migraciones de referencia (`20260812_0002_migrate_legacy_sedan_products.py`), reafirmadas en `team-practices.md` § Deployment. |
| Sanitización CSV (FR5.1) no cubre un vector de inyección real                                    | Test dedicado con valores que empiezan con `=+-@`, per la decisión de Q2 en Practices Discovery.                                                                         |

## Desviación del orden topológico puro

No hay desviación real del orden topológico de `unit-of-work-dependency.md` — U1 antes de U2 ya era la única secuencia válida para la porción dependiente. La única decisión añadida es de granularidad DENTRO de U1/U2 (test de reconciliación antes que UI), no un reordenamiento de Units.
