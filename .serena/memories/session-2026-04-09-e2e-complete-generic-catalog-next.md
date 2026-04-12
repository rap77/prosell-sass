# Session 2026-04-09 — E2E Complete + Generic Catalog Decision

## E2E: 207 passing / 30 skipped / 0 failed

### Root causes fixed
1. global-setup password mismatch (TestPassword123 vs TestPassword123!)
2. Login redirect — tests esperaban /auth/login, ahora va a /dashboard
3. NHTSA: api.nhtsa.us NO existe → vpic.nhtsa.dot.gov SÍ funciona desde Docker
4. VIN inválido → 2GNALCEK1H1615946 (Chevy Equinox 2017)
5. Radix Select patch no llegaba a Docker — COPY patches ./patches en web.Dockerfile
6. Mock auth → FastAPI usa Cookie: access_token=JWT, no Bearer
7. Zustand store vacío → page.route() intercepta /api/auth/state con user mock

## Decisión arquitectura: Generic Catalog (C3)

Eliminar tabla vehicles (sin datos reales) y arrancar con:
- categories(id, name, slug, attribute_schema JSONB, tenant_id)
- products(id, name, price, status, category_id, organization_id, tenant_id, attributes JSONB)
- vehicles(id, product_id FK → products CASCADE, vin, make, model, year, trim, body_type, fuel_type, drivetrain, transmission, engine, mileage_km)

## Próximo paso
/clear → /gsd:new-milestone "Generic Catalog — Categories & Products"
