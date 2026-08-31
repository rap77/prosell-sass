# Functional Design — Preguntas (U1: u1-auth-navigation-refactor)

Este Unit es `kind: ui` (sin entidades de dominio ni reglas de negocio nuevas — `entities.md` y
`rules.md` no aplican por `produces_kinds`). El alcance completo ya está fijado por FR1-FR5 de
`requirements.md`; la única decisión de diseño real que falta es la forma exacta del helper OAuth
consolidado.

## Q1 — Interfaz del helper de redirect OAuth

`LoginPageContent.tsx` (L70) y `RegisterPageContent.tsx` (L99) repiten hoy el mismo patrón:
`window.location.href = \`${base}/api/auth/oauth/${provider}/authorize\``. FR1 pide extraer un
helper compartido. ¿Cómo lo diseñamos?

A. Una función pura que retorna la URL construida (`buildOAuthAuthorizeUrl(provider): string`),
dejando que cada página siga asignando `window.location.href = url` — separa construcción de
efecto secundario, más fácil de testear la construcción de URL sin mockear `window.location`
B. Una función que hace la navegación completa ella misma (`redirectToOAuthProvider(provider): void`),
encapsulando también el `window.location.href =` — menos código repetido en cada call site, pero
requiere mockear `window.location` en los tests
X. Other (please specify)

[Answer]: A. Una función pura que retorna la URL construida

## Consolidated Summary Confirmation

- U1 no tiene entidades ni reglas de negocio nuevas (kind `ui`).
- El helper OAuth consolidado sigue el diseño elegido en Q1.
- El workflow de redirect OAuth (usuario → click → helper → navegación completa → backend →
  provider → callback → cookies → proxy.ts → authStore.ts) se documenta en `functional-spec.md`
  como la especificación de comportamiento (ya confirmado por `architecture.md` § Interaction
  Diagram #3, sin cambios de comportamiento por NFR3).
- FR2 (cero supresores de ESLint) se documenta como decisión de diseño a intentar en Code
  Generation con el helper elegido — la verificación empírica de si la regla de lint sigue
  disparando queda para esa etapa (Open Question OQ1 de `requirements.md`), no se resuelve acá.

Does this all look correct before I generate the artifacts?

A. Looks correct
B. Request changes

[Answer]: Looks correct
