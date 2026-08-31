# Frontend Components — U1 (u1-auth-navigation-refactor)

## Nuevo: `buildOAuthAuthorizeUrl` (helper, no componente)

No es un componente React — es una función pura de utilidad. Se documenta acá porque el stage la
clasifica bajo el matiz "Frontend Components" del Unit `ui`.

- **Ubicación propuesta**: `apps/web/src/lib/auth/oauthRedirect.ts` (junto a `deriveRole.ts`, mismo
  directorio `lib/auth/`, consistente con la organización por feature ya establecida).
- **Firma**: `buildOAuthAuthorizeUrl(provider: 'google' | 'microsoft'): string`
- **Comportamiento**: construye y retorna `${NEXT_PUBLIC_API_URL}/api/auth/oauth/{provider}/authorize`
  sin ejecutar ningún side-effect de navegación (Q1) — el call site sigue siendo responsable de
  `window.location.href = buildOAuthAuthorizeUrl(provider)`.
- **Props/state**: no aplica (función pura, sin estado ni props).

## Modificado: `LoginPageContent.tsx`

- **Cambio**: los 2 `onClick` handlers de los botones OAuth (Google, Microsoft) reemplazan la
  construcción de URL inline duplicada por una llamada a `buildOAuthAuthorizeUrl(provider)`.
- **Props/state**: sin cambios — el componente no gana ni pierde props ni estado.
- **Interaction flow**: sin cambios observables — mismo click, mismo redirect, mismo destino.

## Modificado: `RegisterPageContent.tsx`

- **Cambio**: idéntico al de `LoginPageContent.tsx` — mismos 2 `onClick` handlers migrados al
  helper compartido.
- **Props/state**: sin cambios.
- **Interaction flow**: sin cambios observables.

## Eliminado: `useOAuthPreload.ts` (FR3)

No es un componente sino un hook — código muerto sin consumidores reales, se elimina completo junto
con su test (`useOAuthPreload.test.ts`). No hay flujo de interacción que documentar porque nunca
estuvo wireado a producción.

## Sin cambios de UI

Ningún componente cambia su renderizado, layout, texto visible, o estados de UI (loading/empty/
error/success). Este Unit es puramente un refactor de implementación interna — consistente con
NFR3 de `requirements.md` ("el comportamiento observable ... no debe cambiar para el usuario
final").

## Form Validation

No aplica — no hay formularios nuevos ni cambios de validación en este Unit.

## API Integration Points

Sin cambios: el endpoint externo `${NEXT_PUBLIC_API_URL}/api/auth/oauth/{provider}/authorize` ya
existe y no se modifica; el helper solo centraliza CÓMO se construye la URL hacia ese endpoint, no
introduce una integración nueva.
