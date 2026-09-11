# Risk & Sequencing Rationale — 260911-export-org-selector

## Heurística de secuenciación: value-first, sin WSJF formal

Con un único Unit de trabajo (`U1`, sin dependencias per
`unit-of-work-dependency.md`), no hay múltiples Bolts candidatos
compitiendo por orden — el scoring **WSJF** (Weighted Shortest Job First:
puntaje = (valor de negocio + urgencia + reducción de riesgo) ÷ tamaño,
mayor puntaje primero) solo aporta valor cuando hay que elegir ENTRE
varios Bolts. Acá no hay elección que hacer: value-first colapsa
trivialmente a "el único Bolt se construye completo". Mismo patrón ya
confirmado en `260903-catalog-client-export`.

## Sin desviación del orden topológico

`unit-of-work-dependency.md` declara `depends_on: []` para el único Unit
— no hay orden topológico del que desviarse.

## Riesgo principal identificado (afirmado en la entrevista, Q2)

**Riesgo**: que el estado skeleton/loading del badge de confirmación de
organización (el hallazgo Major encontrado y resuelto en Refined
Mockups — el banner cross-org podía verse idéntico al de organización
propia mientras el nombre no resolvía) no se implemente correctamente en
la práctica, reintroduciendo el riesgo original que AC1.1.5 buscaba
mitigar (exportar la organización equivocada sin darse cuenta).

- **Likelihood**: Baja — el diseño ya deja explícita la unión
  discriminada (`{kind: "own"|"loading"|"cross-org"}`) en
  `interaction-spec.md`, con un ejemplo de código concreto.
- **Impact**: Medio — si se implementa mal, el riesgo de UX original
  reaparece (exportar la organización equivocada), aunque sin
  consecuencia de seguridad real (el backend sigue auditando y
  autorizando correctamente, per NFR1).
- **Mitigación**: Code Generation debe implementar los 3 estados
  explícitamente (no colapsar a `string | undefined`), y el piso mínimo
  de test afirmado en Practices Discovery (punto 3: no-ruptura del
  `OrganizationPicker` existente) debe extenderse a cubrir el nuevo
  estado de loading, no solo el estado final resuelto.

## Sin otros riesgos dominantes

El resto del alcance (wiring del parámetro, mensaje de catálogo vacío,
regresión negativa de permiso) reutiliza patrones y componentes ya
probados (`OrganizationPicker`, `organizationStore`, el endpoint backend
ya estable) — riesgo bajo, sin necesidad de secuenciación especial dentro
del único Bolt.
