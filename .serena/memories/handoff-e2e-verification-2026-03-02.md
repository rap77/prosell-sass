# Handoff: E2E Verification + Extra Bugfixes — 2026-03-02

## Branch: `feature/oauth-backend-callbacks`

## Estado al final de la sesión

### PRP Sprint 1-2: COMPLETO ✅
Todos los 10 fixes del PRP implementados, 331/331 tests pasando.

### E2E Verification con Playwright (Manual Checklist del PRP)

#### ✅ VERIFICADOS
| Check | Resultado |
|-------|-----------|
| Login con email/password → dashboard | ✅ `POST /api/auth/login 200`, URL queda en `/dashboard` |
| Refresh de página logueado → sigue logueado | ✅ No redirect loop |
| Backend `/api/auth/me` → 200 con user data | ✅ `{"id":"31b07...", "roles":[]}` |
| Usuario autenticado → login redirige a dashboard | ✅ `/auth/login` → `/dashboard` |

#### ⚠️ PENDIENTE
| Check | Estado |
|-------|--------|
| Registro → redirige a `/auth/verify-email` | ❌ Bloqueado por CORS en registro + bug user_tokens |
| `initializeAuth` server down → error sin loop | No verificado |
| `verifyEmail` token repetido → segunda llamada va a API | No verificado |

---

## Bugs Adicionales Descubiertos y Corregidos

### Bug 1: `handleResponse` — `[object Object]` en errores FastAPI
**Archivo**: `apps/web/src/lib/api/authApi.ts`
**Problema**: FastAPI devuelve `{"detail": [array]}` para 422. El código pasaba el array directamente a `new ApiError(array)`, resultando en `Error.message = "[object Object]"`.
**Fix**:
```typescript
// BEFORE
throw new ApiError(errorData.detail || "Error en la petición", response.status);

// AFTER — maneja tanto string como array
let message: string;
if (Array.isArray(errorData.detail)) {
  message = errorData.detail.map((e: { msg: string }) => e.msg).join(", ");
} else if (typeof errorData.detail === "string") {
  message = errorData.detail;
} else {
  message = errorData.message || "Error en la petición";
}
throw new ApiError(message, response.status);
```

### Bug 2: `authApi.register()` — body enviaba `first_name`/`last_name` separados
**Archivo**: `apps/web/src/lib/api/authApi.ts`
**Problema**: El backend (`RegisterRequest`) espera `full_name`, pero `authApi.register()` enviaba `first_name` y `last_name` separados → 422 validation error.
**Fix**:
```typescript
// BEFORE
body: JSON.stringify({ email, password, first_name: trimmedFirstName, last_name: trimmedLastName })

// AFTER
body: JSON.stringify({ email, password, full_name: `${trimmedFirstName} ${trimmedLastName}`.trim() })
```

---

## Bug Pendiente: CORS preflight en `/api/auth/register` → 405

**Síntoma**: Formulario de registro desde el browser da `ERR_FAILED`. El preflight OPTIONS a `http://localhost:8000/api/auth/register` retorna 405.

**Context**:
- `authApi.ts` usa `NEXT_PUBLIC_API_URL=http://localhost:8000` (cross-origin desde `localhost:3000`)
- `POST` con `credentials: 'include'` dispara un preflight OPTIONS
- FastAPI responde 405 (Method Not Allowed) al OPTIONS
- El backend tiene `CORSMiddleware` con `allow_origins=["http://localhost:3000", "http://localhost:8000"]`, `allow_credentials=True`, `allow_methods=["*"]`

**Posible causa**: Middleware ordering. En FastAPI, el `CORSMiddleware` debe ser el ÚLTIMO `app.add_middleware()` para ejecutarse PRIMERO. Si hay otro middleware (como el security_headers_middleware custom) antes en el stack, intercepta el OPTIONS antes de que CORS lo maneje.

También, el security_headers_middleware es `@app.middleware("http")` que se ejecuta DESPUÉS de `add_middleware`. El orden de ejecución en FastAPI es:
1. `app.add_middleware()` se ejecuta en orden LIFO (último en ser agregado = primero en ejecutar)
2. `@app.middleware("http")` se ejecuta DESPUÉS de todos los `add_middleware`

Verificar el orden en `main.py` y si el CORS middleware está correctamente posicionado.

**Workaround para E2E**: Usar API_URL a través del proxy de Next.js (relativo: `/api/proxy/...`) en vez de llamar al backend directamente desde el browser. Eso eliminaría el CORS issue completamente.

---

## Bug Pre-existente: `user_tokens` UUID type mismatch

El INSERT en `user_tokens` falla con:
```
DatatypeMismatchError: column "id" is of type uuid but expression is of type character varying
```
Esto bloquea el registro completo (el usuario se crea pero el token de verificación de email no se puede crear → rollback).
Para probar el login, el usuario `e2e_test@prosell.dev` fue insertado directamente en la DB con `email_verified=true`.

---

## Test User en DB (para E2E)
- Email: `e2e_test@prosell.dev`
- Password: `TestPass123@`
- UUID: `31b07ed1-fad9-487b-afc0-9c6583844b5f`
- Status: `active`, `email_verified: true`

---

## Estado de tests al final de la sesión
- Frontend: 331/331 ✅
- TypeScript: 0 errores ✅
- Backend unit: 297 + 1 skip ✅
- Ruff: clean ✅
