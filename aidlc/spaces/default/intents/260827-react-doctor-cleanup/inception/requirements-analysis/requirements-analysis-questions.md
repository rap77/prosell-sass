# Requirements Analysis — Preguntas

Intent: `260827-react-doctor-cleanup` (scope `refactor`, depth Minimal).

La mayoría de las ambigüedades ya se resolvieron durante la sesión (react-doctor
instalado y verificado, primera tanda de 7 archivos ya arreglados, recetas para
los bailouts de try/finally confirmadas, imports dinámicos excluidos, falso
positivo de hidratación rechazado). Estas preguntas cubren solo lo que sigue
genuinamente abierto para poder generar `requirements.md`.

## Q1: Alcance de Construction — ¿qué debe arreglar efectivamente este intent?

El backlog restante son 9 errores (5 con receta ya confirmada + 4 imports
dinámicos fuera de alcance) y 362 warnings repartidos en categorías grandes
(Zod v3→v4 x39, deslop unused-export/file x62, accesibilidad ~85, performance
~50, componentes gigantes x32, bugs varios ~55, seguridad x3).

- A. Solo los 5 fixes de try/finally con receta ya confirmada (los errores restantes) — todo lo demás queda documentado como backlog para un intent futuro, sin tocar código en esta pasada.
- B. Los 5 fixes confirmados + una muestra representativa (1-3 archivos) por cada categoría grande de warnings, con checkpoint de aprobación antes de aplicar en masa — el mismo patrón que ya venimos usando en esta sesión.
- C. Los 5 fixes confirmados + resolver completamente todas las categorías de warnings en esta misma pasada (los 362 warnings).
- D. Solo producir el backlog priorizado como output de este intent — sin tocar código en absoluto, ni siquiera los 5 fixes confirmados.
- X. Other (please specify)

[Answer]: B. Los 5 fixes confirmados + una muestra representativa (1-3 archivos) por cada categoría grande de warnings, con checkpoint de aprobación antes de aplicar en masa.

## Q2: Criterio de "terminado" para este refactor

- A. Alcanzar un score numérico objetivo (especificar cuál, ej. 70/100).
- B. Cero errores de react-doctor; los warnings quedan trackeados como backlog de seguimiento, sin bloquear el cierre de este intent.
- C. Sin umbral fijo — arreglar lo que decida el alcance de Q1 y reportar el score resultante, sea cual sea.
- D. Resolver los 371 diagnostics completos (backlog en cero).
- X. Other (please specify)

[Answer]: B. Cero errores de react-doctor; los warnings quedan trackeados como backlog de seguimiento, sin bloquear el cierre de este intent.

## Q3: ¿Este refactor incluye pasar el gate de react-doctor de advisory a bloqueante?

Hoy ni el hook de pre-commit ni el workflow de CI pueden bloquear una
regresión — ambos son advisory-only (ver `architecture.md` diagrama #6 y
`code-quality-assessment.md`).

- A. Sí, pasar ambos (pre-commit y CI) a bloqueante una vez que el backlog esté en un nivel manejable.
- B. Sí, pero solo CI a bloqueante — dejar pre-commit advisory.
- C. No — dejar ambos advisory; es trabajo de seguimiento separado, no parte de este refactor.
- X. Other (please specify)

[Answer]: C. No — dejar ambos advisory; es trabajo de seguimiento separado, no parte de este refactor.

## Q4 (follow-up): "Cero errores" — contradicción a resolver

Q2 dice que el criterio de terminado es "cero errores de react-doctor". Pero de
los 9 errores actuales, hay 5 que **no van a bajar a cero con el alcance
decidido en Q1**, porque ya se decidieron como fuera de alcance en esta misma
sesión:

- **4 imports dinámicos** (`useOAuthPreload.ts` x2, `products.ts`, `verticals.ts`) — decisión ya tomada: NO tocar, es code-splitting deliberado.
- **1 falso positivo** (`no-hydration-branch-on-browser-global` en `categories.ts`) — ya evaluado y rechazado: el código no necesita cambiar, react-doctor lo sigue marcando igual.

Un rescan crudo de react-doctor va a seguir mostrando esos 5 como "error"
indefinidamente salvo que se los suprima explícitamente en la configuración de
la herramienta (`doctor.config.*` / `package.json#reactDoctor`) — algo que
todavía no se decidió.

- A. "Cero errores" se refiere solo a los 5 fixes de try/finally en alcance (el resto de errores en el output crudo de react-doctor). No suprimir nada en la config — el criterio de "terminado" de este intent es sobre los fixes que sí se tocan, no sobre el conteo crudo de la herramienta.
- B. Agregar una supresión explícita en la config de react-doctor para esos 5 casos (imports dinámicos + falso positivo), documentando el motivo, así el conteo crudo de errores también llega a cero.
- C. Revertir la decisión anterior y tocar los 4 imports dinámicos también (convertirlos a import estático) para que el conteo crudo baje a cero sin necesidad de suprimir nada.
- X. Other (please specify)

[Answer]: A. "Cero errores" se refiere solo a los 5 fixes de try/finally en alcance. No suprimir nada en la config — el criterio de "terminado" de este intent es sobre los fixes que sí se tocan, no sobre el conteo crudo de la herramienta.

## Consolidated Summary Confirmation

- Alcance de Construction: los 5 fixes de try/finally restantes con receta ya confirmada (onboarding/page.tsx x3, UnifiedProductForm.tsx, BulkUploadCSV.tsx) + una muestra representativa (1-3 archivos) por cada categoría grande de warnings, con checkpoint de aprobación antes de aplicar en masa a cada categoría.
- Fuera de alcance, sin tocar: los 4 imports dinámicos (code-splitting deliberado) y el falso positivo de hidratación ya rechazado.
- Criterio de "terminado": cero errores de react-doctor sobre los 5 fixes en alcance — no se toca la config de react-doctor para suprimir los otros 5 errores que quedan fuera de alcance; el conteo crudo de la herramienta puede seguir mostrándolos.
- El gate de react-doctor (pre-commit y CI) queda advisory-only — pasar a bloqueante es trabajo de seguimiento separado, no parte de este refactor.
- Las categorías grandes de warnings no incluidas en la muestra representativa quedan documentadas como backlog priorizado para un intent futuro, no resueltas en esta pasada.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
