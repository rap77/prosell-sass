# Security Design — U2 (`u2-vehicle-catalog-ui`)

Basado en `nfr-requirements/security-requirements.md` (NFR4.2, NFR4.3).

## Manejo de errores (NFR4.2, NFR4.3)

Los 3 flujos usan `extractErrorMessage(body, fallback)` (`apps/web/src/lib/api/extractErrorMessage.ts`, ya vigente) para extraer un mensaje legible del body de error del backend (`{"detail": "<string>"}`) — mismo patrón ya usado en `products.ts`. Un fallo de red (fetch rechazado, sin conexión) se captura con un `catch` explícito que muestra un toast de error genérico, sin dejar una unhandled rejection — mandate Q6 de `team-practices.md` (manejo de errores centralizado en frontend).

## Sin superficie de XSS/almacenamiento nuevo

Los 3 flujos renderizan valores del catálogo canónico y de ubicación vía JSX estándar (escape automático de React) — sin `dangerouslySetInnerHTML` ni inyección de HTML crudo. Sin almacenamiento en `localStorage`/`sessionStorage` — todo el estado vive en memoria de React/React Hook Form durante la sesión del formulario.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-18T00:03:30Z
**Iteration:** 1

### Resultado del sensor real de trazabilidad

Corrí:

```
bun .claude/tools/aidlc-sensor-traceability.ts --output-path aidlc/spaces/default/intents/260915-vehicle-catalog/construction/u2-vehicle-catalog-ui/nfr-design/traceability.json --stage-slug nfr-design
```

Resultado exacto: `{"pass":true,"gaps":[],"orphans":[],"missing_from_table":[],"missing_from_upstream_ids":[],"invalid_entries":[],"invalid_targets":[],"findings_count":0}`. Sin gaps, sin huérfanos, sin entradas inválidas — el sensor confirma mecánicamente que `traceability.json` de esta etapa está completo y bien formado.

### Verificaciones realizadas

1. **Sensor real**: `pass:true` (arriba) — no es una inspección visual, es la corrida real de la herramienta.
2. **Consistencia de IDs NFR4.1/NFR4.2/NFR4.3**: verificado carácter a carácter en las 4 ubicaciones — `nfr-requirements/performance-requirements.md` (NFR4.1), `nfr-requirements/security-requirements.md` (NFR4.2, NFR4.3), `nfr-design/performance-design.md` § "Diseño: sin caché/optimización nueva (NFR4.1)", `nfr-design/security-design.md` § "Manejo de errores (NFR4.2, NFR4.3)", y `traceability.json` (`upstream_ids: ["NFR4.1","NFR4.2","NFR4.3"]`, `coverage` con targets que apuntan a las secciones correctas). Ningún desfasaje — a diferencia del defecto ya corregido en NFR Requirements (`NFR-PERF-1`/`NFR-SEC-1`/`NFR-SEC-2` renombrados a `NFR4.x` precisamente por este mismo tipo de problema), esta etapa nació directamente con el formato correcto.
3. **`extractErrorMessage()` real**: confirmado que existe en `apps/web/src/lib/api/extractErrorMessage.ts` y que el patrón descrito en `security-design.md` es fiel a su implementación real — recibe un `body: unknown`, lo parsea con un schema Zod `looseObject({ detail, message })`, y devuelve `detail` (string o `detail[0].msg` si es el array de validación 422 de FastAPI) o `message`, con `fallback` si no matchea. La descripción del artefacto ("extraer un mensaje legible del body `{"detail": "<string>"}`") es correcta para el caso citado (mismo shape que usa `products.ts`), aunque omite mencionar las dos variantes adicionales que la función también soporta (array de validación, campo `message`) — no es una tergiversación, solo una simplificación aceptable dado que el shape citado es el que realmente devuelven los 2 endpoints que consume U2 (`POST /vehicles/decode-vin`, `GET /categories/facebook-values/{field_key}`, ambos U1, mismo patrón `HTTPException(detail=str(e))` ya confirmado en intents previos).
4. **`logical-components.md` vs `frontend-components.md`**: sin contradicción. Los 3 componentes citados en `logical-components.md` (bloque `vin_decode`/`select` de `SchemaFieldRenderer.tsx`, `category-schema-editor.tsx`, `ProductLocationFields`) coinciden exactamente con los 3 componentes de integración de `frontend-components.md` (misma jerarquía real ya verificada por el reviewer de Functional Design — `SchemaFormSection.tsx` → `SchemaFieldRenderer.tsx`, sin `GenericFormFields`/`GenericProductForm` inexistentes).
5. **Constraint de la etapa**: `security-design.md` y `performance-design.md` son prosa pura, sin ningún bloque de código real ni pseudocódigo — respetan el límite de la etapa.

### Hallazgos

Ninguno — Critical: 0, Major: 0, Minor: 0.

### Summary

El diseño de NFR de U2 es sólido: el sensor real de trazabilidad pasa sin gaps, los IDs `NFR4.1`/`NFR4.2`/`NFR4.3` son consistentes carácter a carácter entre `nfr-requirements`, `nfr-design` y `traceability.json`, `extractErrorMessage()` existe y se usa fielmente a su implementación real, y `logical-components.md` no contradice `frontend-components.md` ya aprobado. A diferencia de los hallazgos Critical atrapados en Functional Design de esta misma Unit (vocabulario inventado, componentes sin importadores reales), esta etapa no reintroduce ningún patrón de ese tipo — no hay código nuevo que reconcile vocabularios ni componentes nuevos sin verificar. READY.
