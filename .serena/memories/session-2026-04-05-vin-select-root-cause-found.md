# Session 2026-04-05: VIN Select Bug — Root Cause Found

## Goal
Systematic debugging del bug VIN Select usando context7 docs + web research.

## Root Cause (CONFIRMADO)
Radix UI Select v2.2.6 + React 19.2.4 + `<form>` = BubbleInput dispara `onValueChange("")` espurio.

- `SelectBubbleInput` es un `<select>` nativo oculto para form submission
- En primer render, `nativeOptionsSet` está VACÍO → native select sin `<option>` → change event con "" → reset
- `isFormControl = trigger.closest("form")` → siempre true dentro de RHF `<form>`
- Issues: radix-ui/primitives#3381, #3693, facebook/react#30580

## Fix Planificado
1. **Opción B (preferida)**: `pnpm patch @radix-ui/react-select`
   - Cambio: `isFormControl ?` → `(isFormControl && nativeOptionsSet.size > 0) ?`
   - En dist/index.mjs línea ~115 y dist/index.js
2. **Plan B**: Reemplazar Radix Select con `<select>` nativo + Tailwind + register() directo

## Versiones
- @radix-ui/react-select@2.2.6
- react@19.2.4
- react-hook-form@7.71.1

## Archivos Clave
- `apps/web/src/components/forms/VehicleForm.tsx` — Select+Controller afectados
- `apps/web/src/components/ui/select.tsx` — shadcn wrapper (no es el problema)
- `node_modules/@radix-ui/react-select/dist/index.mjs` — source del bug

## Lección
Sesiones anteriores fallaron porque atacaban SÍNTOMAS (dynamic keys, ?? "" fallback, undefined vs ""). El systematic debugging con lectura del source code de Radix reveló la causa real.

## Next
Aplicar pnpm patch → verificar → limpiar debug logs → commit con GGA
