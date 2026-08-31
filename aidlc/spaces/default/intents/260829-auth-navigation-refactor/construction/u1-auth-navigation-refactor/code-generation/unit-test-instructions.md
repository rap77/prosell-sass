# Unit Test Instructions — U1 (u1-auth-navigation-refactor)

## Test Framework Setup

Ya configurado — Vitest + Testing Library, sin cambios de configuración necesarios para este
Unit. Verificar antes de escribir el primer test (Step 1 del plan):

```bash
pnpm --filter web exec vitest run --project unit src/lib/auth/oauthRedirect.test.ts tests/app/auth/login/page.test.tsx tests/app/auth/register/page.test.tsx
```

(Comando exacto a confirmar/ajustar contra `apps/web/vitest.config.ts` — el filtro por archivo
mantiene el comando acotado a este Unit, no a la suite completa.)

## Cómo correr los tests de este Unit

```bash
cd apps/web && pnpm exec vitest run src/lib/auth/oauthRedirect.test.ts tests/app/auth/login/page.test.tsx tests/app/auth/register/page.test.tsx
```

## Expected Coverage Targets

Test Strategy Standard (5-8 tests por componente, unit + integración en fronteras clave) + piso de
scope `classic` (mantener la suite existente en verde, sin nuevo piso adicional — NFR2).

- **`buildOAuthAuthorizeUrl`** (nuevo, ~4-6 tests): construye la URL correcta para `google`,
  construye la URL correcta para `microsoft`, no ejecuta ningún side-effect de navegación (función
  pura), maneja `NEXT_PUBLIC_API_URL` tal como está configurado hoy (sin cambiar ese
  comportamiento).
- **`LoginPageContent.tsx` / `RegisterPageContent.tsx`** (extender tests existentes, ~2-3 tests
  nuevos por página): el `onClick` del botón Google invoca el helper con `'google'` y asigna el
  resultado a `window.location.href`; ídem para Microsoft. Cierra el gap de 0% de cobertura ya
  señalado por Reverse Engineering y por el reviewer de Functional Design.
- **`fetchWithAuth.ts`** (extender si existe test, o 1 test acotado nuevo): el redirect de sesión
  expirada sigue apuntando al destino correcto tras el Step 5 del plan — cierra el hallazgo Major
  del reviewer de Functional Design (FR2.1 sin cobertura asignada en FR5).

## Mocking / Stubbing Guidance

- Mockear `window.location.href` como setter espiado (no jsdom real navigation) para los tests de
  `LoginPageContent`/`RegisterPageContent` — patrón ya usado en tests de auth existentes si aplica.
- `buildOAuthAuthorizeUrl` en sí NO requiere mockear `window.location` (función pura, Q1 de
  Functional Design) — testeable con inputs/outputs directos.
- Mockear `process.env.NEXT_PUBLIC_API_URL` según el patrón ya establecido en tests existentes del
  proyecto para esa variable, si existe.

## Test Data Management

Sin datos de test complejos — providers son un union literal (`'google' | 'microsoft'`), casos
cubiertos exhaustivamente con 2 valores. No se requieren factories ni fixtures nuevas.
