# API Documentation — ProSell SaaS

## Superficie de API — resumen

| Capa                         | Ubicación                                             | Cantidad                                           | Protocolo             |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------------------- | --------------------- |
| FastAPI REST (backend real)  | `apps/api/src/prosell/infrastructure/api/routers/`    | 31 módulos de router, **30 wireados** en `main.py` | HTTP/JSON             |
| Middleware FastAPI           | `apps/api/src/prosell/infrastructure/api/middleware/` | 4 archivos                                         | request pipeline      |
| Next.js BFF proxy (frontend) | `apps/web/src/app/api/{auth,v1}/**/route.ts`          | 30 archivos de ruta                                | HTTP/JSON (proxy)     |
| Middleware Next.js           | `apps/web/src/proxy.ts`                               | 1 archivo                                          | routing/auth-redirect |

## FastAPI REST — backend (`apps/api`)

- **31 módulos de router** bajo `infrastructure/api/routers/`, cubriendo: products, auth, users, organizations, teams, branches, user-branch, categories, category-schema, vehicles, leads, appointments, notifications, wallet, publisher, images, marketplace-access, admin, admin-organizations, org-verticals, Facebook sync/account/credential-migration, health, webhook.
- `main.py` registra **30** de esos módulos vía `app.include_router(...)` — un módulo de router no aparece registrado; no confirmado este pase si es un router deliberadamente desactivado o un olvido (ver `code-quality-assessment.md`).
- Convenciones confirmadas por memoria del proyecto y consistentes con el patrón Clean Architecture escaneado:
  - Los updates de estado **siempre** van en el body JSON, nunca en query params.
  - El `tenant_id` se resuelve **siempre** del JWT, nunca del body — mitigación explícita de IDOR.
- Auth: JWT + OAuth2 + TOTP (2FA), cookies httpOnly (`access_token`, `refresh_token`), reforzado por middleware en capas: `auth_middleware.py` (autenticación), `rbac_middleware.py` (autorización por rol), `rate_limit_middleware.py` (throttling), `exception_handlers.py` (manejo centralizado de errores).
- No se leyó en este pase el contenido interno de cada router endpoint por endpoint (skimmed a nivel de nombre de archivo/registro) — un futuro pase que necesite el catálogo endpoint-por-endpoint debe volver a escanear `infrastructure/api/routers/` a profundidad.

## Next.js BFF Proxy — frontend (`apps/web`)

**30 archivos de ruta** bajo `app/api/{auth,v1}/**/route.ts`, divididos en dos grupos:

- **`api/auth/*`** — endpoints nativos de cookies implementados directamente como route handlers de Next.js (login, logout, register, refresh, state, me, forgot/reset-password, verify-email) — no son proxies puros, contienen lógica de auth propia del lado Next.js.
- **`api/v1/*`** — proxies pass-through hacia el backend FastAPI para products, categories, organizations, org, teams, users, vehicles, wallet, más dos endpoints especiales de bulk-upload de productos (`preview`, `with-images`). Varios usan segmentos catch-all `[...path]/route.ts` (products, organizations, categories, vehicles) para reenviar sub-rutas arbitrarias.

Además, un middleware propio `apps/web/src/proxy.ts` resuelve el matching de rutas y las redirecciones de auth antes de llegar a cualquier route handler, con tablas `PROTECTED_ROUTES`/`PUBLIC_ROUTES`/`AUTH_REDIRECT_ROUTES`.

### ⚠️ Defecto conocido — `response.json()` sin verificación de `content-type`

Los proxies **catch-all** dinámicos de `products`, `categories`, `organizations` y `vehicles` fuerzan `response.json()` sobre **toda** respuesta del backend, sin comprobar el header `content-type` primero. Este pase no releyó el cuerpo de cada archivo línea por línea (skimmed) — el hallazgo se hereda de la documentación previa del proyecto y se re-confirma como aún abierto según `project.md`.

**Impacto**: cualquier endpoint del backend que devuelva un content-type distinto de JSON (CSV de export, descarga de archivo, etc.) rompe al pasar por estos proxies.

**Historial del mismo patrón de bug**: memoria del proyecto documenta un caso hermano ya arreglado — el header `If-Match` era descartado silenciosamente por estos mismos proxies, rompiendo los 4 endpoints de "deshacer" (`reverse`/`resubmit`/`restore`/`revert-sale`) cuando se usaban desde navegador real (fix verificado en vivo con chrome-devtools MCP, sesión 2026-08-21). El defecto de `content-type` es el mismo patrón de raíz (proxy que asume una forma fija de respuesta) sin arreglar aún.

**Regla operativa activa** (memoria del proyecto, `project.md`): antes de agregar un endpoint que devuelva un content-type distinto de JSON, auditar el proxy correspondiente.

## Cliente API frontend (`apps/web/src/lib/api/`)

- Presencia y estructura confirmadas; no releído módulo por módulo en este pase (skimmed).
- Cada módulo consume el proxy BFF correspondiente, nunca llama directo a `apps/api`.
- Esquemas Zod-mirror (`apps/web/src/lib/api/schemas/`) espejan 1:1 los DTOs Pydantic del backend (patrón "Zero unvalidated `as X` casts on backend responses", regla zero-tolerance del proyecto). Puntos de fricción documentados:
  - Campos `Optional[X]` de Pydantic serializan a `null` en JSON — el mirror debe usar `.nullable().optional()`, nunca solo `.optional()` (bug histórico: `decode-vin` schema mismatch).
  - Estado de migración Zod 3→4: el paquete instala `zod: ^4.4.0` pero el código sigue en estilo Zod 3 (41+ `.passthrough()`, `z.nativeEnum()` en `leads.ts`); `AGENTS.md` documenta la regla "usar Zod 3 hasta resolver issue #74" pese al paquete ya instalado — migración completa trackeada por separado en el intent `260828-zod-3-to-4-migration`, **fuera de alcance de este documento**.

## Contratos internos relevantes no cubiertos en profundidad este pase

- Contenido detallado de los 31 módulos de router (endpoint por endpoint, request/response shape) — solo registro/nombre, no catálogo.
- Cuerpos de los use cases de `application/` — no leídos a nivel de firma.
- Cuerpos individuales de las 30 rutas BFF más allá del patrón `[...path]/route.ts` ya conocido.

Un futuro pase de `functional-design` o `contract-design` que necesite especificar contratos exactos endpoint-por-endpoint debe re-escanear `apps/api/src/prosell/infrastructure/api/routers/` y `apps/web/src/app/api/` a profundidad completa.
