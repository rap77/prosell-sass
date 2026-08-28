# API Documentation — ProSell SaaS

## Superficie de API — resumen

| Capa                         | Ubicación                                          | Cantidad                  | Protocolo          |
| ---------------------------- | -------------------------------------------------- | ------------------------- | ------------------ |
| FastAPI REST (backend real)  | `apps/api/src/prosell/infrastructure/api/routers/` | 31 routers, 190 endpoints | HTTP/JSON          |
| Next.js BFF proxy (frontend) | `apps/web/src/app/api/{auth,v1}/**/route.ts`       | 33 archivos de ruta       | HTTP/JSON (proxy)  |
| Cliente API frontend         | `apps/web/src/lib/api/`                            | 27 módulos                | fetch tipado       |
| Esquemas Zod-mirror          | `apps/web/src/lib/api/schemas/`                    | 18 módulos                | validación runtime |

## FastAPI REST — backend (`apps/api`)

- **31 archivos de router**, **190 endpoints** contados directamente por decorador (`@router.get/post/put/patch/delete`).
- Convenciones confirmadas por memoria del proyecto y consistentes con el patrón Clean Architecture escaneado:
  - Los updates de estado **siempre** van en el body JSON, nunca en query params.
  - El `tenant_id` se resuelve **siempre** del JWT, nunca del body — mitigación explícita de IDOR.
- Auth: JWT + OAuth2 + TOTP (2FA), cookies httpOnly (`access_token`, `refresh_token`).
- No se leyó en este pase el contenido interno de cada router (skimmed a nivel de nombre de archivo/conteo) — un futuro pase que necesite el catálogo endpoint-por-endpoint debe volver a escanear `infrastructure/api/routers/` a profundidad.

## Next.js BFF Proxy — frontend (`apps/web`)

**33 archivos de ruta** bajo `app/api/{auth,v1}/**/route.ts` (incluye 2 co-localizados `route.test.ts`), actuando como capa BFF entre el navegador y FastAPI. Reenvían la petición al backend, incluyendo cookies de sesión.

### ⚠️ Defecto conocido — `response.json()` sin verificación de `content-type`

Los proxies **dinámicos** (`[...path]/route.ts`) de los siguientes recursos fuerzan `response.json()` sobre **toda** respuesta del backend, sin comprobar el header `content-type` primero:

- `apps/web/src/app/api/v1/products/[...path]/route.ts`
- `apps/web/src/app/api/v1/categories/[...path]/route.ts`
- `apps/web/src/app/api/v1/organizations/[...path]/route.ts`
- `apps/web/src/app/api/v1/vehicles/[...path]/route.ts`

**Impacto**: cualquier endpoint del backend que devuelva un content-type distinto de JSON (CSV de export, descarga de archivo, etc.) rompe al pasar por estos proxies — el `.json()` lanza sobre un cuerpo que no es JSON válido.

**Historial del mismo patrón de bug**: memoria del proyecto documenta un caso hermano ya arreglado — el header `If-Match` era descartado silenciosamente por estos mismos proxies (solo reenviaban `Content-Type`/`Cookie`), rompiendo los 4 endpoints de "deshacer" (`reverse`/`resubmit`/`restore`/`revert-sale`) cuando se usaban desde navegador real. Verificado y arreglado en sesión 2026-08-21 con chrome-devtools MCP en vivo. El defecto de `content-type` es el mismo patrón de raíz (proxy que asume una forma fija de respuesta) sin arreglar aún.

**Regla operativa activa** (memoria del proyecto, `project.md`): antes de agregar un endpoint que devuelva un content-type distinto de JSON, auditar el proxy correspondiente.

## Cliente API frontend (`apps/web/src/lib/api/`)

- **27 módulos de cliente**, uno por dominio/recurso (mapeo aproximado 1:1 con los routers del backend, aunque el conteo no coincide exactamente porque algunos routers backend no tienen cliente dedicado y viceversa — no verificado línea por línea en este pase).
- Cada módulo consume el proxy BFF correspondiente, nunca llama directo a `apps/api`.

## Esquemas Zod-mirror (`apps/web/src/lib/api/schemas/`)

- **18 módulos de esquema**, cada uno espejando 1:1 el DTO Pydantic del endpoint backend correspondiente (patrón "Zero unvalidated `as X` casts on backend responses", confirmado por memoria del proyecto como regla zero-tolerance).
- Puntos de fricción documentados de este patrón (memoria del proyecto):
  - Campos `Optional[X]` de Pydantic serializan a `null` en JSON — el mirror debe usar `.nullable().optional()`, nunca solo `.optional()` (bug histórico: `decode-vin` schema mismatch).
  - Estado de migración Zod 3→4: el paquete instala `zod: ^4.4.0` pero el código sigue en estilo de Zod 3 (41× `.passthrough()`, 4× `z.nativeEnum()` en `leads.ts`); `AGENTS.md` documenta la regla "usar Zod 3 hasta resolver issue #74" pese al paquete ya instalado — migración completa trackeada por separado en el intent `260828-zod-3-to-4-migration`, **fuera de alcance de este documento**.

## Contratos internos relevantes no cubiertos en profundidad este pase

- Contenido detallado de los 31 routers (endpoint por endpoint, request/response shape) — solo conteo, no catálogo.
- Contratos de los 20 grupos de use cases de `application/` — no leídos a nivel de firma.

Un futuro pase de `functional-design` o `contract-design` que necesite especificar contratos exactos endpoint-por-endpoint debe re-escanear `apps/api/src/prosell/infrastructure/api/routers/` y `apps/web/src/lib/api/` a profundidad completa.
