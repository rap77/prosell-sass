# Units Generation — Plan de Descomposición

## Contexto

Los 5 FR de `requirements.md` son todos modificaciones acotadas y fuertemente acopladas dentro de
la misma área frontend (navegación auth): consolidar un helper de redirect OAuth compartido entre
`LoginPageContent.tsx`/`RegisterPageContent.tsx`, eliminar los supresores de ESLint restantes,
borrar `useOAuthPreload.ts` (código muerto), corregir el JSDoc de `proxy.ts` y agregar cobertura de
test para los botones OAuth. Domain Design se salteó porque no hay componentes nuevos — todo vive
dentro del componente frontend existente (`prosell-web`, según `component-inventory.md`).

No hay más de una descomposición viable acá: todos los cambios tocan los mismos archivos o
archivos directamente relacionados (el helper consolidado es consumido por login/register, que ya
comparten el mismo patrón duplicado), y no hay ninguna frontera de despliegue, servicio o dominio
distinta que justifique separarlos en más de un Unit. Se salta el bloque de preguntas de estrategia
de descomposición (Step 3) porque no hay ambigüedad genuina que resolver — un solo Unit es la única
opción sensata.

## Plan Propuesto

- **1 Unit**: `U1` — `u1-auth-navigation-refactor`
- **Kind**: `ui` (superficie frontend, sin runtime propio ni contrato de servicio)
- **Responsabilidades**: FR1 (helper OAuth consolidado), FR2 (cero supresores ESLint), FR3
  (eliminar `useOAuthPreload.ts`), FR4 (JSDoc de `proxy.ts`), FR5 (tests de botones OAuth)
- **Dependencias**: ninguna (`depends_on: []`) — no depende de otros Units, no hay otros Units en
  este intent
- **Complejidad relativa**: S (small) — cambios acotados a ~6 archivos ya identificados por
  Reverse Engineering, sin cambios de infraestructura ni de contrato externo
- **Modelo de deploy**: embebido en el deploy normal de `apps/web` (no standalone)

## Aprobación del Plan

[Answer]: Approve Plan

## Consolidated Summary Confirmation

- 1 Unit (`U1` / `u1-auth-navigation-refactor`, kind `ui`, sin dependencias, complejidad S) cubre los 5 FR completos.
- Sin dependencias entre Units, sin paralelismo posible (un solo Unit).
- Todos los FR (FR1–FR5) mapeados a U1 en `unit-of-work-story-map.md` y `traceability.json`.

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
