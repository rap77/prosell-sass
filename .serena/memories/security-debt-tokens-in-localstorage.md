# Security Debt: Tokens in localStorage (CRITICAL)

**Fecha**: 2026-02-17
**Prioridad**: CRITICAL - Security Vulnerability
**Estado**: Documentado - Pendiente de Fix

---

## 🚨 Problema de Seguridad Detectado

**GGA found CRITICAL security vulnerability in authStore.ts:**

```typescript
// ❌ VULNERABLE - Tokens in localStorage (XSS risk)
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: string | null;        // Stored in localStorage
      refreshTokenValue: string | null;   // Stored in localStorage
      // ...
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,        // ❌ PERSISTED
        refreshTokenValue: state.refreshTokenValue,  // ❌ PERSISTED
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

**Vulnerability:**
- localStorage es accesible por CUALQUIER JavaScript (XSS attacks)
- Tokens pueden ser leídos por malicious scripts
- Contradice los comentarios del archivo: "Tokens stored in httpOnly cookies (backend)"

---

## ✅ Solución Correcta (Backend httpOnly Cookies)

**Qué deberíamos hacer:**

```typescript
// ✅ CORRECTO - Solo datos no-sensibles en store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: User | null;              // ✅ Solo datos básicos
      isAuthenticated: boolean;       // ✅ Flag boolean
      isLoading: boolean;
      error: AuthError | null;
      // ❌ SIN accessToken en store
      // ❌ SIN refreshTokenValue en store
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,                    // ✅ Persistir user
        isAuthenticated: state.isAuthenticated,  // ✅ Persistir flag
        // ❌ NO persistir tokens
      }),
    }
  )
);
```

**Backend debería:**
- Set httpOnly cookies en login/register
- Validar cookies en cada request
- Refrescar tokens vía httpOnly cookie
- Eliminar cookies en logout

---

## 🔍 Impacto Actual

**Archivos que necesitan refactor:**

1. **apps/web/src/stores/authStore.ts**
   - Remover `accessToken` y `refreshTokenValue` del estado
   - Actualizar `partialize` para NO persistir tokens
   - Actualizar `login()`, `register()`, `refreshToken()` para no guardar tokens

2. **apps/web/src/lib/api/authApi.ts**
   - Revisar si usa tokens del store
   - Dejar que backend maneje cookies automáticamente

3. **apps/web/src/app/actions/auth-actions.ts**
   - Server Actions - verificar si leen tokens del store

4. **Tests que usen authStore**
   - Actualizar para no esperar tokens en el store

---

## 📋 Plan de Migración

### Fase 1: Backend (Pre-requisito)
- [ ] Verificar que API routes ya setean httpOnly cookies
- [ ] Verificar que API routes validan cookies en cada request
- [ ] Implementar refresh token endpoint que use cookies

### Fase 2: Frontend - Store Refactor
- [ ] Remover `accessToken` de AuthState interface
- [ ] Remover `refreshTokenValue` de AuthState interface
- [ ] Actualizar `partialize` para no persistir tokens
- [ ] Actualizar `login()` - no guardar tokens
- [ ] Actualizar `register()` - no guardar tokens
- [ ] Actualizar `refreshToken()` - no guardar tokens
- [ ] Actualizar `initializeAuth()` - no leer tokens

### Fase 3: Frontend - API Client
- [ ] Revisar authApi.ts - ¿usa tokens del store?
- [ ] Remover token headers si backend usa cookies automáticamente
- [ ] Actualizar authApi para no enviar tokens en Authorization header

### Fase 4: Tests
- [ ] Actualizar tests de authStore
- [ ] Actualizar tests de authApi
- [ ] Actualizar tests de integración

### Fase 5: Verification
- [ ] Verificar que auth funciona sin tokens en store
- [ ] Verificar que refresh token funciona
- [ ] Verificar que logout elimina cookies
- [ ] Verificar que no hay tokens en localStorage

---

## ⚠️ Por Qué No Lo Arreglamos Ahora

**Razón para Opción B (dejar para después):**

1. **Es un cambio arquitectónico grande**
   - Afecta múltiples archivos (store, api, actions, tests)
   - Riesgo de romper la autenticación completamente
   - Requiere testing exhaustivo de E2E

2. **El objetivo actual era optimización de localStorage**
   - Ya completamos: localStorage versioning
   - Ya completamos: logger wrapper
   - Ya completamos: cleanup de utils.ts

3. **Aplicamos systematic debugging correctamente**
   - Encontramos la causa raíz (branch desactualizado)
   - Limpiamos utils.ts de optimizaciones prematuras
   - Documentamos el problema de seguridad para próximo sprint

---

## 🎯 Recomendación

**Crear PRP (Project Requirements Plan):**

```
Título: Migrate auth to httpOnly cookies only
Prioridad: CRITICAL (Security)
Estimado: 2-3 días
Riesgo: Alto (afecta core auth flow)

Dependencias:
- Backend debe ya implementar httpOnly cookies
- Requiere E2E testing completo

Métricas de éxito:
- [ ] No tokens en localStorage
- [ ] No tokens en Zustand store
- [ ] Todos los tests de auth pasan
- [ ] E2E tests de login/logout pasan
- [ ] GGA approval (type-safe, secure)
```

---

## 📚 Referencias

**OWASP on Token Storage:**
- https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html#Token Storage
- "Store tokens in httpOnly cookies... Never store tokens in localStorage"

**Next.js httpOnly Cookies:**
- https://nextjs.org/docs/app/api-reference/functions/next-response-cookies
- `response.cookies.set()` con `httpOnly: true`

---

**Última actualización**: 2026-02-17
**Autor**: rpadron
**Estado**: Pendiente de implementar en siguiente sprint
**Referencia**: Session 2026-02-17 - Opción B elegida por usuario
