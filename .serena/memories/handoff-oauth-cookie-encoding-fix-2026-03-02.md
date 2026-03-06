# Session: OAuth Cookie Encoding Fix

**Fecha**: 2026-03-02
**Rama**: `feature/oauth-backend-callbacks`

## Problema

OAuth Google flow: `localhost:3000/auth/login?redirect=%2Fdashboard` en vez del dashboard.

## Root Causes (en orden de descubrimiento)

### 1. UUID Type Mismatch (`oauth_accounts`)
```
column "id" is of type uuid but expression is of type character varying
```
`OAuthAccountModel.id` y `.user_id` definidos como `String(36)` pero DB (post-migración) tiene `uuid`.

**Fix**: Eliminar `String(36)`, usar `Mapped[UUID]` puro. Mismo patrón que `UserModel` / `SessionModel`.

### 2. Python SimpleCookie + Next.js Edge Runtime Cookie Bug (el real)

**Cadena**:
1. `quote(json)` → `%7B%22id%22%3A...` (URL-encoded)
2. `SimpleCookie` → `Set-Cookie: user_data="%7B%22id%22..."` (agrega comillas dobles)
3. Next.js Edge Runtime → URL-decodea el contenido PERO **preserva las comillas externas**
4. `req.cookies.get("user_data").value` → `"{"id":"...","full_name":"Rafael Padron",...}"`
5. `JSON.parse('"{"id"...')` → **SyntaxError** (el `"` abre string, el `{` la rompe)
6. `userData = null` → `isAuthenticated = false` → redirect a login

**Metodología de diagnóstico**: Debug endpoint `/api/debug-cookies` que dumpea `req.cookies.getAll()` y el raw Cookie header. Redirigir `OAUTH_FRONTEND_SUCCESS_URL` a ese endpoint via env var en docker-compose.

## Fixes Aplicados

### Backend
```python
# auth_router.py
from urllib.parse import quote

# En /login:
response.set_cookie(key="user_data", value=quote(result.user.model_dump_json()), ...)

# En /oauth/{provider}/callback:
redirect.set_cookie(key="user_data", value=quote(login_result.user.model_dump_json()), ...)
```

### Frontend
```typescript
// middleware.ts
let raw = userDataCookie ?? "";
// Strip outer double-quotes that Python's SimpleCookie adds when encoding cookie values
if (raw.startsWith('"') && raw.endsWith('"') && raw.length > 2) {
  raw = raw.slice(1, -1);
}
const decoded = raw ? decodeURIComponent(raw) : null;
userData = decoded ? (memoizedJsonParse(decoded) as UserData | null) : null;
```

## Archivos Modificados

- `apps/api/src/prosell/infrastructure/models/oauth_account_model.py`
- `apps/api/src/prosell/infrastructure/repositories/oauth_repository_impl.py`
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py`
- `apps/web/src/middleware.ts`
- `apps/web/src/app/api/debug-cookies/route.ts` (temporal, eliminar)

## Lección Aprendida

**Debugging cross-service cookies**: Siempre instrumentar con un debug endpoint que muestre TANTO el valor parseado (`req.cookies.getAll()`) COMO el header raw (`req.headers.get("cookie")`). La diferencia entre los dos revela si hay encoding/decoding intermedio.

**Python SimpleCookie**: Es impredecible con valores complejos. Siempre usar `urllib.parse.quote()` para JSON en cookies y manejar las comillas externas en el consumer.
