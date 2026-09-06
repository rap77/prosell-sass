# Risk & Sequencing Rationale — Export de catálogo

## Heurística elegida: value-first, sin scoring formal

Con un único Bolt en el plan (`bolt-plan.md`), no hay orden entre Bolts
que decidir — la pregunta de secuenciación económica de esta etapa
(WSJF, riesgo-primero, walking-skeleton-primero, o valor-primero) colapsa
a una sola decisión: ¿vale la pena bundlear ambas Units en un solo Bolt
en vez de separarlas? Sí — heurística **value-first**: el valor completo
del feature (exportar catálogo compatible con `facebook-auto-post`, sin
reformateo manual) solo existe cuando U1 (backend) y U2 (frontend) están
completas juntas. Entregar U1 sin U2 no le da a Valeria ninguna forma de
usar el export (sin UI); entregar U2 sin U1 no tiene backend contra el
cual funcionar. No hay valor parcial real que aislar en un Bolt separado.

No se usó scoring WSJF formal (Reinertsen/SAFe: valor + urgencia ÷
tamaño) porque con un solo Bolt no hay nada que rankear entre sí — el
scoring solo aporta cuando hay múltiples Bolts candidatos compitiendo por
orden.

## Desviación respecto al orden topológico de Units Generation

`unit-of-work-dependency.md` (2.7) estableció la topología:
`u2-catalog-export-ui` depende de `u1-catalog-export-api` — eso define
QUÉ puede depender de qué, no en qué orden se construye. Dentro del
único Bolt de esta etapa, la construcción real (Code Generation, 3.5)
respeta ese orden: U1 se implementa primero (es la dependencia), U2
después (consume el contrato ya implementado) — sin desviación real del
orden topológico, solo su ejecución dentro de un mismo Bolt en vez de dos
Bolts secuenciales.

## Por qué no walking-skeleton-first

`team.md`/`org.md` ya afirmaron (Q2 en el intent `260829-auth-navigation-refactor`,
sin especialización nueva para este intent) que el equipo **no corre la
ceremonia de walking skeleton** — van directo a las features. Esta
decisión es de nivel de equipo/proyecto, no específica de este intent;
`bolt-plan.md` no incluye ningún Bolt marcado como skeleton.

## Por qué no risk-first

Los riesgos de seguridad identificados en `requirements.md` (zip-slip
NFR2, IDOR NFR1, DoS por memoria NFR3) ya están mitigados por **diseño**
en `contract-summary.md` (contrato de error tipado, tenant_id solo del
JWT, sanitización obligatoria) y en las decisiones de Domain
Design/Units Generation — no requieren un Bolt separado dedicado a
"probar primero la parte riesgosa"; el riesgo se cierra con las
decisiones arquitectónicas ya tomadas, no con secuenciación.

## Risk Register

| Risk                                                                                                                            | Likelihood                              | Impact | Mitigation                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zip-slip vía nombres de carpeta no sanitizados                                                                                  | Baja (mitigación de diseño ya definida) | Alto   | Reutilizar sanitizador ya probado (`_slug_part()`/equivalente) — cerrado en `requirements.md` NFR2, `contract-summary.md`.                                                            |
| DoS por agotamiento de memoria armando el ZIP completo                                                                          | Media (número de cap aún no fijado)     | Alto   | Enforcement del cap de recursos (NFR3) — número exacto diferido a NFR Design, pero el comportamiento de rechazo ya está fijado en `stories.md` US1.3/AC1.3.1.                         |
| Ambigüedad de lectura de imágenes (`get_object` vs. `httpx`) retrasa Code Generation                                            | Baja                                    | Bajo   | Decisión explícitamente diferida y acotada a Functional Design — no bloquea el resto del Bolt, ambas opciones ya evaluadas sin dependencias nuevas (`requirements.md` § Constraints). |
| Tensión textual entre AC1.1.1 ("no requiere ninguna acción adicional") y los pasos de confirmación agregados en Refined Mockups | Baja                                    | Bajo   | Hallazgo Major de `mockups.md` (READY, no bloqueante) — documentado como deuda para que Functional Design reconcilie la redacción, sin reabrir un stage ya cerrado.                   |
