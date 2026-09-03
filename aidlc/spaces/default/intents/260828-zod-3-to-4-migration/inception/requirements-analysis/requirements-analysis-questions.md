# Requirements Analysis — Preguntas

Contexto: Reverse Engineering (scan enfocado) ya resolvió la mayoría de las ambigüedades técnicas de esta migración (conteo exacto de call sites, estado real del issue #74, patrón de colocación de esquemas). Depth activo: Minimal (2-4 preguntas). Las preguntas que quedan son decisiones de alcance/diseño que el scan señaló explícitamente como abiertas para esta etapa.

## Q1: Bloque de excepción Zod 3 en `AGENTS.md`

El scan confirmó que el issue #74 está CERRADO desde 2026-07-20 y que su alcance nunca cubrió `.passthrough()`/`z.nativeEnum()` — solo el patrón de mensaje de error, ya migrado al 100%. El bloque actual de `AGENTS.md` (líneas 124-139, encabezado "Zod 3 Syntax (until issue #74 is resolved)") es la causa mecánica de que GGA haya bloqueado un intento parcial de migración anterior, porque su frase de cierre ("PASS any code using Zod 3 validator syntax. DO NOT flag as 'Zod 4 Rule' violation.") es más amplia que el ejemplo puntual que documenta. ¿Cómo debería tratarse ese bloque?

A. Eliminarlo por completo — ya no hay ninguna excepción Zod 3 vigente (el issue está cerrado y su alcance real ya migró al 100%); GGA vuelve a las reglas Zod 4 estándar sin excepción.
B. Acotarlo explícitamente — mantener el bloque pero reescribirlo para que aplique solo a un caso puntual que el equipo quiera seguir permitiendo (especificar cuál en el detalle de la respuesta).
C. Solo corregir el estado del issue (marcarlo como cerrado) sin tocar el alcance de la excepción — riesgo: GGA probablemente sigue bloqueando la migración de `.passthrough()`/`z.nativeEnum()` igual que antes.
X. Other (please specify)

[Answer]: A. Eliminarlo por completo

## Q2: Call site estructuralmente distinto — `UnifiedProductForm.tsx:483`

`FIXED_FIELDS_SCHEMA` (definido como `z.object({...})` estricto en la línea 99) se usa en dos lugares: en la línea 483 se le aplica `.passthrough()` en el USE SITE (`FIXED_FIELDS_SCHEMA.passthrough().parse(data)`), y en la línea 290 se usa en modo estricto vía `.merge(attrSchema)`. Migrar la definición completa a `z.looseObject()` cambiaría el comportamiento en ambos call sites, no solo en el de la línea 483. ¿Cómo debería resolverse?

A. Dejar `.passthrough()` como llamada de instancia en la línea 483 tal cual está (sigue existiendo en `ZodObject` de Zod 4; no es el patrón recomendado para definiciones, pero es válido para un caso puntual como este) — no tocar la definición de `FIXED_FIELDS_SCHEMA`.
B. Introducir un segundo esquema derivado en modo "loose" específico para el uso de la línea 483 (p. ej. `FIXED_FIELDS_SCHEMA_LOOSE = z.looseObject({...})` duplicando la forma), dejando `FIXED_FIELDS_SCHEMA` estricto para la línea 290.
C. Migrar la definición completa a `z.looseObject()` y aceptar el cambio de comportamiento también en la línea 290 (verificar en Code Generation que no rompa nada).
X. Other (please specify)

[Answer]: B. Introducir un segundo esquema derivado en modo "loose"

## Q3: Deuda técnica adyacente detectada durante el scan

El scan detectó dos hallazgos relacionados pero no nombrados en la descripción original del intent: (1) `apps/web/src/lib/zod-resolver.ts`, un shim de `zodResolver` nunca importado en ningún lado (código muerto de un paso intermedio de la migración #74), y (2) `apps/web/src/app/(seller)/settings/profile/page.tsx:28`, un `.string().email({ message: "..." })` con la sintaxis encadenada + clave `message` de Zod 3 en vez de `z.email({ error: ... })` de Zod 4 — misma familia de drift de sintaxis, pero fuera del patrón `.passthrough()`/`z.nativeEnum()` que el intent nombra explícitamente. ¿Entran en el alcance de este intent?

A. No — dejar ambos fuera de alcance, documentados como deuda conocida para un intent futuro (consistente con el patrón ya establecido del proyecto de no ampliar alcance sin que se pida explícitamente).
B. Sí, ambos — es la misma limpieza de idioma Zod y no amerita un intent separado.
C. Solo el residuo de `profile/page.tsx:28` (mismo patrón de sintaxis que el resto de la migración) — dejar el código muerto de `zod-resolver.ts` para un cleanup separado.
X. Other (please specify)

[Answer]: B. Sí, ambos

## Consolidated Summary Confirmation

- Q1: El bloque de excepción Zod 3 de `AGENTS.md` (líneas 124-139) se elimina por completo — el issue #74 está cerrado y su alcance nunca cubrió `.passthrough()`/`z.nativeEnum()`.
- Q2: `FIXED_FIELDS_SCHEMA` en `UnifiedProductForm.tsx` mantiene su definición estricta (usada en la línea 290); se introduce una segunda variante loose derivada específicamente para el uso de la línea 483.
- Q3: Tanto el código muerto `zod-resolver.ts` como el residuo `.string().email({message})` de `profile/page.tsx:28` entran en el alcance de este intent.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
