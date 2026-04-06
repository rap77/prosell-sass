# Session 2026-04-04: VehicleForm VIN Select Bug Investigation

**Status**: PAUSED - Bug investigation sin resolver

## Resumen Ejecutivo

Phase 10 (Contract Testing Skill) está 100% completa (7/7 tareas), pero se descubrió un bug crítico durante verificación en staging: **VehicleForm VIN decode no actualiza los Select fields**.

## El Bug

**Síntoma**: Después de hacer "Decode VIN", los campos de texto (model, engine, trim) se llenan correctamente, pero los Select fields (make, body_type, drivetrain, transmission, fuel_type) permanecen vacíos.

**Investigación realizada**:
- ✅ Backend API funciona correctamente (verificado con curl)
- ✅ Normalizer retorna valores correctos: make=chevrolet, body_type=suv, drivetrain=FWD
- ✅ Input fields SÍ se actualizan con VIN decode
- ❌ Select fields NO se actualizan - ni selección manual ni programática

## Root Cause Identificado

**Radix UI Select + React Hook Form Controller incompatibilidad**

Los warnings en consola: `Select is changing from uncontrolled to controlled`

Esto indica que el Select cambia de estado cuando `setValue()` actualiza de `undefined` a un string. Radix UI Select no maneja correctamente esta transición de estado.

**Fix intentado (FALLÓ)**:
- Removimos `?? ""` fallback de `value={field.value ?? ""}`
- Esto NO funcionó - el commit fue revertido (3e72ced)

## Archivos Clave

- `apps/web/src/components/forms/VehicleForm.tsx` - Formulario con VIN decode + Select problemáticos
- `apps/web/src/lib/constants/fbVehicleOptions.ts` - FB_BRANDS, FB_BODY_STYLES
- `apps/web/src/lib/logger.ts` - Logger con logger.debug() agregado
- `apps/api/src/prosell/infrastructure/services/nhtsa_normalizer.py` - Normalizer funcionando

## Próximos Pasos (Para próxima sesión)

1. **Investigar solución correcta para Radix UI Select + RHF**:
   - Probar `defaultValue` en lugar de `value` (uncontrolled mode)
   - Crear custom wrapper SelectController
   - Considerar react-select u otra librería compatible

2. **Setear development environment**:
   ```bash
   DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell" uv run fastapi dev src/prosell/infrastructure/api/main.py --reload
   ```

3. **Probar exhaustivamente** en local development con logs visibles

4. **Limpiar logs de debug** después de verificar fix

## Commits Relevantes

- `c8867e0` - fix(forms): remove ?? '' fallback (REVERTIDO - no funcionó)
- `3e72ced` - Revert "fix(forms): remove ?? '' fallback"
- `bd40831` - fix(logging): correct logger.error call

## Handoff File

`.planning/phases/10-contract-testing-skill/.continue-here.md` - Estado completo con next actions detallados.

---

*Session Date: 2026-04-04*
*Status: PAUSED - Pending solution for Radix UI Select + RHF integration*
