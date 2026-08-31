# User Stories — Assessment

## Decision: Skip

## Rationale

Este intent (`260829-auth-navigation-refactor`) es un refactor interno de código en el frontend
de navegación auth: consolidar un helper de redirect OAuth duplicado, eliminar 5 supresores de
ESLint, borrar código muerto (`useOAuthPreload.ts`), corregir un JSDoc desactualizado y agregar
cobertura de test que hoy falta. NFR3 en `requirements.md` establece explícitamente que "el
comportamiento observable del flujo OAuth ... no debe cambiar para el usuario final — este es un
refactor interno de código, no un cambio de UX".

No hay features nuevas, no hay personas nuevas ni cambio de flujo de usuario, y no hay lógica de
negocio nueva o compleja involucrada — es exactamente el caso "pure refactoring" que la condición
de este stage indica saltear.

## Factors Considered

- **Project type**: refactor de código existente, no nueva funcionalidad.
- **User-facing scope**: ninguno — el comportamiento externo (redirect OAuth, sesión, rol) se
  mantiene idéntico por diseño (NFR3).
- **Complexity signals**: cambios acotados a un puñado de archivos frontend ya identificados por
  Reverse Engineering; sin coordinación cross-team, sin personas múltiples nuevas a modelar.
- **Multiple personas**: no aplica — el único actor tocado (usuario que hace login/register vía
  OAuth) ya está cubierto de punta a punta por los FRs de `requirements.md`, no requiere una
  historia de usuario separada para describir su journey.

## Alternative Coverage

`requirements.md` (Requirements Analysis) ya contiene 5 requerimientos funcionales con IDs
estables (FR1–FR5), cada uno con criterio de aceptación implícito y verificable (helper
consolidado, cero supresores de ESLint salvo justificación documentada, eliminación de código
muerto, JSDoc corregido, cobertura de test nueva para los botones OAuth). Domain Design y Units
Generation pueden trabajar directamente desde esos FRs sin necesidad de historias de usuario
adicionales — no hay brecha de trazabilidad que las stories resolverían acá.
