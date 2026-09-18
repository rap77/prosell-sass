# Integration Test Instructions — Catálogo Canónico de Vehículos para Facebook

Test Strategy: Standard → boundary tests entre u1-vehicle-catalog-api (backend) y u2-vehicle-catalog-ui (frontend), los dos únicos puntos de integración inter-Unit declarados en `contract-summary.md`.

## Boundary 1 — `POST /vehicles/decode-vin` (Contrato 1, extendido)

**Contrato**: `vehicle` con valores ya reconciliados + `unmatched_fields: list[str]` nuevo.

**Verificación de forma ejecutada en esta corrida** (comparación directa de código, no mockeada):

- Backend (`apps/api/src/prosell/infrastructure/api/routers/vehicle_router.py:93`): `VINDecodeResponse.unmatched_fields: list[str]`.
- Frontend (`apps/web/src/lib/api/schemas/decodeVin.ts:68`): `unmatched_fields: z.array(z.string()).default([])`.
- **Coinciden exactamente** — mismo nombre de campo, mismo tipo (array de strings), default `[]` en ambos lados (backend `Field(default_factory=list)`, frontend `.default([])`).

**Cobertura existente por lado** (ya ejecutada, ver `test-results.md`):

- Backend: `tests/integration/services/test_vin_decode_integration.py` — 3 casos nuevos de `unmatched_fields` contra un decode real (Postgres real, sin mock del contrato).
- Frontend: `apps/web/tests/unit/lib/api/vin-decode.test.ts`, `VinDecodeField.test.tsx`, `SchemaFieldRenderer.test.tsx` — consumo de `unmatchedFields` con `fetch`/TanStack Query mockeado al shape exacto del backend.

## Boundary 2 — `GET /categories/facebook-values/{field_key}` (Contrato 2, nuevo)

**Contrato**: `{field_key: string, options: string[]}`, 404 si `field_key` no reconocido.

**Verificación de forma ejecutada en esta corrida**:

- Backend (`apps/api/src/prosell/infrastructure/api/routers/category_router.py:95-97`): `_FacebookValueOptionsResponse(field_key: str, options: list[str])`.
- Frontend (`apps/web/src/lib/api/schemas/categorySchema.ts:110-113`): `FacebookValueOptionsResponseSchema = z.object({field_key: z.string(), options: z.array(z.string())})`.
- **Coinciden exactamente**.

**Cobertura existente por lado**:

- Backend: `apps/api/tests/unit/api/routers/test_category_router.py` — 200 con lista exacta, 404 + warning logueado, contra Postgres real.
- Frontend: `apps/web/src/components/admin/category-schema-editor.test.tsx` — consumo vía `useCanonicalFieldOptions`, fallback 404, con `fetch` mockeado al shape exacto.

## Qué NO cubre esta corrida (alcance deliberado de Standard, no un gap silencioso)

No existe un test end-to-end real (frontend vivo contra backend vivo, ej. Playwright) que ejercite estos 2 boundaries juntos en un solo proceso — cada lado los verifica contra el shape del contrato de forma independiente (backend con Postgres real pero sin frontend; frontend con `fetch` mockeado al shape exacto pero sin backend real). Para Test Strategy Standard esto es la cobertura de boundary esperada (`test-strategy-patterns.md`: contract testing sin infraestructura E2E completa); un E2E real quedaría dentro de Comprehensive o de una necesidad puntual (ej. incidente en este boundary específico) — no se generó en esta corrida por no estar en el piso de test afirmado en `team-practices.md` ni pedido por el usuario.

## Cómo re-ejecutar esta verificación de boundary

```bash
# Comparación de forma (repetible sin infraestructura):
rg -n "unmatched_fields" apps/api/src/prosell/infrastructure/api/routers/vehicle_router.py apps/web/src/lib/api/schemas/decodeVin.ts
rg -n "field_key|options" apps/api/src/prosell/infrastructure/api/routers/category_router.py apps/web/src/lib/api/schemas/categorySchema.ts

# Tests de cada lado (ver test-results.md para el comando completo de cada suite):
cd apps/api && uv run pytest tests/integration/services/test_vin_decode_integration.py tests/unit/api/routers/test_category_router.py -v
cd apps/web && pnpm vitest run tests/unit/lib/api/vin-decode.test.ts src/components/admin/category-schema-editor.test.tsx
```
