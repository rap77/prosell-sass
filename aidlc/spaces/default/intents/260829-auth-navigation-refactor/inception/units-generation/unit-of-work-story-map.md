# Unit Story Map

User Stories fue salteado para este intent (refactor interno puro, sin personas ni comportamiento
nuevo — ver `inception/user-stories/user-stories-assessment.md`). Este mapa usa los requerimientos
funcionales de `requirements.md` como fallback, tal como especifica `traceability.json` de este
stage.

## Requirement → Unit Mapping

| Requirement                     | Implementing Unit | Directory                     |
| ------------------------------- | ----------------- | ----------------------------- |
| FR1 (helper OAuth consolidado)  | U1                | `u1-auth-navigation-refactor` |
| FR2 (cero supresores de ESLint) | U1                | `u1-auth-navigation-refactor` |
| FR3 (eliminar código muerto)    | U1                | `u1-auth-navigation-refactor` |
| FR4 (JSDoc de `proxy.ts`)       | U1                | `u1-auth-navigation-refactor` |
| FR5 (cobertura de test OAuth)   | U1                | `u1-auth-navigation-refactor` |

## Cross-Cutting Concerns

Ninguno — todos los FR son implementados por el mismo Unit; no hay requerimiento que cruce
fronteras de Unit (solo hay un Unit).

## Implementation Order Within U1

No aplica una secuencia crítica entre FRs — son mayormente independientes entre sí (helper OAuth,
código muerto, JSDoc, tests), aunque FR5 depende naturalmente de que FR1 exista primero (los tests
nuevos cubren el helper consolidado). La secuencia exacta de implementación dentro del Unit es
decisión de Code Generation, no de este stage (Stage 2.7 no recomienda orden — ver Stage 2.9
Delivery Planning para la secuencia económica).

## Coverage Verification

- Todo FR (FR1–FR5) tiene un Unit asignado: ✅ (todos → U1)
- Todo Unit tiene al menos un requerimiento: ✅ (U1 tiene los 5)
