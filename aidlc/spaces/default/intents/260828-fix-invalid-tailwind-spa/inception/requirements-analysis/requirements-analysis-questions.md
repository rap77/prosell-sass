# Requirements Analysis — Questions

Intent: fix invalid Tailwind spacing utility classes (`h-9.5`, `px-4.5`, `h-8.5`) that compile to empty CSS because they fall outside Tailwind 3.4.17's default spacing scale and are not extended in `tailwind.config.ts`.

Contexto de reverse-engineering (full rescan): el scan encontró que el bug afecta **7 archivos, 13 instancias** — 2 archivos más de lo que decía el pedido original (`PublishForm.tsx`, `KanbanBoard.tsx`). Causa raíz probable: `CLAUDE.md` dice Tailwind 4.0 pero el proyecto corre 3.4.17.

## Q1: Enfoque de arreglo

¿Cómo corregimos las clases inválidas?

A. Extender el theme de Tailwind (`tailwind.config.ts`) agregando los pasos 4.5/8.5/9.5 a la escala de `spacing` — las clases actuales quedan válidas tal cual están escritas, pero se amplía la escala de diseño global del proyecto
B. Reemplazar por clases de valor arbitrario con el mismo tamaño en píxeles exacto (ej. `h-9.5` → `h-[38px]`, `px-4.5` → `px-[18px]`) — mismo enfoque ya usado para arreglar `BulkUploadCSV.tsx` en el intent anterior, sin tocar la config
C. Reemplazar por la clase de la escala estándar más cercana (ej. `h-9.5` → `h-9` o `h-10`) — puede causar un cambio visual pequeño (2-4px)
X. Other (please specify)

[Answer]: X. Other — el usuario propuso considerar actualizar Tailwind a la última versión estable en vez de arreglar las clases dentro de TW 3.4.17. Pendiente de resolución (ver ## Follow-Up abajo) — contradice la restricción explícita "Do NOT migrate to TW4" del pedido original.

## Q2: Alcance de archivos

A. Arreglar los 7 archivos encontrados por el scan (los 5 originalmente nombrados + `PublishForm.tsx` y `KanbanBoard.tsx`, descubiertos durante reverse engineering) — 13 instancias en total
B. Arreglar solo los 5 archivos originalmente nombrados (10 instancias) — dejar `PublishForm.tsx` y `KanbanBoard.tsx` para un follow-up aparte
X. Other (please specify)

[Answer]: A. Arreglar los 7 archivos encontrados por el scan (los 5 originalmente nombrados + PublishForm.tsx y KanbanBoard.tsx) — 13 instancias en total

## Q3: Drift documental en CLAUDE.md

A. Corregir también la tabla de Tech Stack en `CLAUDE.md` raíz (dice TailwindCSS 4.0, en realidad es 3.4.17) como parte de este intent — es la causa raíz probable de esta clase de bug
B. Dejar la corrección de `CLAUDE.md` fuera de alcance; trackearla aparte
X. Other (please specify)

[Answer]: A. Corregir también la tabla de Tech Stack en CLAUDE.md raíz como parte de este intent

## Follow-Up Q1: Upgrade de Tailwind vs. arreglo puntual

El pedido original de este intent dice explícitamente **"Do NOT migrate to TW4"**. La respuesta a Q1 propuso evaluar actualizar Tailwind a la última versión estable — lo cual, si se refiere a Tailwind 4, contradice esa restricción directamente. Además, una migración de Tailwind 3→4 es un cambio de framework mucho más grande que este bugfix (v4 reescribe la config de JS a CSS-based `@theme`, cambia defaults, puede romper otras clases del proyecto) — no es del tamaño de un intent `express`/bugfix como este.

A. Mantenernos en Tailwind 3.4.17 y arreglar las clases dentro de esa versión — elegí uno de los 3 enfoques originales (extender theme / valor arbitrario / clase estándar más cercana)
B. Sí, quiero evaluar el upgrade a Tailwind 4 — pero como un intent aparte (igual que se hizo con la migración de Zod 3→4), no dentro de este bugfix
C. Quiero que este mismo intent incluya el upgrade completo a Tailwind 4 en vez del arreglo puntual (esto expande mucho el alcance/riesgo de lo que pediste originalmente)
X. Other (please specify)

[Answer]: B. Upgrade a TW4 como intent aparte — este intent (260828-fix-invalid-tailwind-spa) se mantiene en Tailwind 3.4.17. Nota: el upgrade a TW4 queda como trabajo futuro fuera de este intent — no hay todavía un intent registrado para él.

## Q1 (retomada): Enfoque de arreglo dentro de Tailwind 3.4.17

Con el intent confirmado en TW 3.4.17, falta elegir el enfoque original de Q1:

A. Extender el theme de Tailwind (`tailwind.config.ts`) agregando los pasos 4.5/8.5/9.5 a la escala de `spacing` — las clases actuales quedan válidas tal cual están escritas, pero se amplía la escala de diseño global del proyecto
B. Reemplazar por clases de valor arbitrario con el mismo tamaño en píxeles exacto (ej. `h-9.5` → `h-[38px]`, `px-4.5` → `px-[18px]`) — mismo enfoque ya usado para arreglar `BulkUploadCSV.tsx` en el intent anterior, sin tocar la config
C. Reemplazar por la clase de la escala estándar más cercana (ej. `h-9.5` → `h-9` o `h-10`) — puede causar un cambio visual pequeño (2-4px)
X. Other (please specify)

[Answer]: A. Extender el theme de Tailwind (tailwind.config.ts) agregando 4.5/8.5/9.5 a la escala de spacing

## Consolidated Summary Confirmation

- Enfoque de arreglo: extender `tailwind.config.ts` agregando los pasos `4.5`, `8.5` y `9.5` a la escala de `spacing` — las clases inválidas quedan válidas tal cual están escritas hoy, sin tocar el markup
- Alcance: los 7 archivos encontrados por el scan (13 instancias) — `privacy/page.tsx`, `terms/page.tsx`, `publications/page.tsx`, `OnboardingStep3.tsx`, `AppointmentForm.tsx` (los 5 originales) + `PublishForm.tsx` y `KanbanBoard.tsx` (descubiertos en reverse engineering)
- Se corrige también el drift documental en `CLAUDE.md` raíz (tabla de Tech Stack: dice TailwindCSS 4.0, en realidad es 3.4.17)
- El proyecto se mantiene en Tailwind 3.4.17 — NO se migra a Tailwind 4 en este intent. Un eventual upgrade a Tailwind 4 queda como intent aparte, mismo patrón que la migración de Zod 3→4

- Looks correct
- Request changes

[Answer]: Looks correct
