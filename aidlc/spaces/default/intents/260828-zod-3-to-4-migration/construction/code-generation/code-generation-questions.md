# Code Generation Questions — Zod 3 → Zod 4 Migration

## Plan Approval

Se generaron `code-generation-plan.md` (14 pasos, con el bloque `## Testing Contract` embebido) y `unit-test-instructions.md` (4 tests nuevos en 3 archivos, cubriendo FR1/FR1.4/FR2/FR5; FR3/FR4 verificados por lint/typecheck/GGA, no por test unitario ya que son cambios de documentación/eliminación de código muerto).

Resumen del plan:

- Migrar 36 call sites de `.passthrough()` → `z.looseObject()` en 14 archivos (FR1).
- Caso especial `UnifiedProductForm.tsx`: nueva variante `FIXED_FIELDS_SCHEMA_LOOSE` para el use-site de la línea 483, sin tocar la definición estricta usada en la línea 290 (FR1.4).
- Migrar 4 call sites de `z.nativeEnum()` → `z.enum()` en `leads.ts`/`appointments.ts` (FR2).
- Eliminar el bloque de excepción Zod 3 de `AGENTS.md` (FR3).
- Eliminar el shim muerto `zod-resolver.ts` (FR4).
- Migrar `profile/page.tsx:28` a `z.email({ error: ... })` (FR5).
- Verificar empíricamente que GGA ya no bloquea tras la eliminación de FR3 (NFR2).
- Correr la suite completa para confirmar cero regresión (NFR1).

[Approval Fingerprint]: sha256:b6cf3dad543d89cce55fa385356352b6875151ed59ad7449289abc4703543e3a

- Approve Plan
- Request Changes

[Answer]: Approve Plan
