# Requirements Analysis — Questions

Intent: `260831-invalid-tailwind-classes` (scope: bugfix, depth: Minimal)

Reverse Engineering (scan enfocado) reencuadró el alcance real de este intent: 4 de los 5 archivos originalmente sospechados (`privacy/page.tsx`, `terms/page.tsx`, `OnboardingStep3.tsx`, `AppointmentForm.tsx`) ya fueron arreglados por el commit `624819e3`, mergeado en `main` antes de que este intent arrancara — sus clases `h-9.5`/`px-4.5` ya son válidas hoy. El único archivo con clases genuinamente inválidas confirmadas es `apps/web/src/app/(seller)/publications/page.tsx`, con un patrón distinto (`.25`/`.75`, no `.5`) no catalogado antes:

| Clase      | Líneas   |
| ---------- | -------- |
| `gap-1.25` | 208, 488 |
| `p-0.75`   | 479      |
| `mt-0.25`  | 524      |
| `mb-0.75`  | 594      |

Además, el codekb existente cataloga (de un pase de scan anterior, NO re-verificado en este scan enfocado) el mismo patrón `.25`/`.75` en otros 3 archivos: `PublicationStatus.tsx`, `LeadStatusBadge.tsx`, `ProductImageGallery.tsx`.

## Q1: Alcance del fix

¿Qué archivos debe cubrir el fix de este intent?

A. Solo `publications/page.tsx` (las 5 clases confirmadas y re-verificadas en este pase) — el resto queda para un intent futuro dedicado
B. `publications/page.tsx` + los 3 archivos heredados (`PublicationStatus.tsx`, `LeadStatusBadge.tsx`, `ProductImageGallery.tsx`) — pero esos 3 requieren una verificación línea-por-línea nueva antes de generar el fix, ya que no fueron re-confirmados en este scan
X. Other (please specify)

[Answer]: A. Solo publications/page.tsx

## Q2: Naturaleza de los valores fraccionarios `.25`/`.75`

Ninguna clase `.25`/`.75` está en la escala default de Tailwind 3 (half-steps `0.5/1.5/2.5/3.5` solamente) ni en la extensión de `tailwind.config.ts` (que solo cubre `4.5`/`8.5`/`9.5`). ¿Son valores de diseño intencionales (spacing más fino que el estándar) o probablemente typos de los enteros vecinos?

A. Son typos — corregir al entero más cercano (`gap-1.25` → `gap-1`, `p-0.75` → `p-1`, `mt-0.25` → `mt-1` o `mt-0`, `mb-0.75` → `mb-1`), decidiendo caso por caso en el contexto visual de cada línea
B. Son valores de diseño intencionales — preservar el valor exacto convirtiéndolo a la sintaxis de valor arbitrario de Tailwind (p.ej. `gap-1.25` → `gap-[5px]`)
C. No lo sé con certeza — usar sintaxis de valor arbitrario (opción B) como default seguro, ya que preserva el valor visual exacto sin asumir que es un error
X. Other (please specify)

[Answer]: C. No lo sé con certeza

## Q3: Patrón de fix preferido

El proyecto tiene dos patrones ya establecidos para este tipo de bug: (a) sintaxis de valor arbitrario `h-[38px]` (usado en `BulkUploadCSV.tsx`, intent `260828-fix-invalid-tailwind-spa`), o (b) extender `theme.extend.spacing` en `tailwind.config.ts` con el valor exacto (usado por el commit `624819e3` para la familia `.5`). ¿Cuál preferís para este fix?

A. Sintaxis de valor arbitrario in-line (`gap-[5px]`, etc.) — cambio acotado al archivo tocado, sin tocar config compartido
B. Extender `tailwind.config.ts` con los pasos `.25`/`.75` que falten — reutilizable si estas fracciones aparecen en otros archivos (incluidos los 3 heredados de Q1 si se incluyen en el alcance)
X. Other (please specify)

[Answer]: B. Extender tailwind.config.ts

## Consolidated Summary Confirmation

- Alcance: solo `apps/web/src/app/(seller)/publications/page.tsx`, las 5 ocurrencias confirmadas (`gap-1.25` x2, `p-0.75`, `mt-0.25`, `mb-0.75`) — los 3 archivos heredados (`PublicationStatus.tsx`, `LeadStatusBadge.tsx`, `ProductImageGallery.tsx`) quedan fuera, para un intent futuro
- Los valores `.25`/`.75` se tratan como potencialmente intencionales (no se asume typo) — se preserva el valor exacto
- Mecanismo de fix: extender `theme.extend.spacing` en `apps/web/tailwind.config.ts` con los pasos `0.25` y `0.75` (siguiendo el precedente del commit `624819e3` para la familia `.5`), en vez de sintaxis de valor arbitrario in-line
- El fix es un cambio de configuración con test de respaldo, siguiendo el patrón ya establecido en `apps/web/tests/unit/config/tailwind.config.test.ts`

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
