# Requirements Analysis — Questions

Intent: migrar los patrones `useEffect` para fetch/mutación de datos a Server Component o TanStack Query en dos páginas críticas — `apps/web/src/app/onboarding/page.tsx` (fetch inicial de organización con wizard multi-step) y `apps/web/src/app/invite/[token]/page.tsx` (acepta invitación de equipo vía `teamApi.acceptInvitation` en el mount, mutación con 5 estados de UI: loading/success/error/expired/already_member).

Contexto de reverse-engineering (scan enfocado): la violación literal de `AGENTS.md:333` es solo el `useEffect` de mount en ambas páginas. `handleStep1`/`completeSetup` en `onboarding/page.tsx` son llamadas imperativas por click (no por efecto) — candidatas a `useMutation` pero no son la violación en sí. Ni `orgApi.ts` ni `teamApi.ts` usan `fetchWithAuth` hoy (sin auto-refresh de sesión en 401). Existen tres formas de manejo de error incompatibles en el área (`ApiError`, `Error` genérico, matching de string) — el equipo ya afirmó como convención hacia adelante (Q6 de `team.md`) adoptar en frontend un patrón de excepciones tipadas + manejo centralizado equivalente al del backend. Cero tests existen hoy para ambas páginas.

## Q1: Alcance del fix — ¿solo los `useEffect` de mount, o también las llamadas imperativas?

A. Solo los `useEffect` de mount (`checkSetup`/`getMyOrganization` en onboarding, `acceptInvitation` en invite) — el fix mínimo que resuelve la violación literal de `AGENTS.md:333`; `handleStep1`/`completeSetup` de onboarding quedan como llamadas imperativas tal cual están, sin tocar
B. Los `useEffect` de mount + convertir también `handleStep1`/`completeSetup` de onboarding a `useMutation`, por consistencia de patrón dentro del mismo archivo
C. Todo lo de B + además cerrar el gap de `fetchWithAuth` en `orgApi.ts`/`teamApi.ts` (agregar auto-refresh en 401) como parte de este mismo bugfix
D. Mix — depende de la función/API, quiero especificar caso por caso
X. Other (please specify)

[Answer]: A. Solo los useEffect de mount (checkSetup/getMyOrganization en onboarding, acceptInvitation en invite) — handleStep1/completeSetup quedan tal cual, sin tocar

## Q2: Patrón para `invite/[token]/page.tsx` (mutación disparada en el mount)

El pedido original mencionó explícitamente decidir entre Server Component async y `useMutation` con guard anti-doble-disparo para esta página.

A. `useMutation` (client component) con guard anti-doble-disparo (ej. flag por `useRef`, o disparar solo si el estado de la mutación es `idle`) — mantiene la página como client component, patrón similar al `useNotifications()` ya existente en el repo
B. Server Component async — mover la aceptación de invitación a un Server Action / fetch en el server, eliminando el `useEffect` de cliente por completo; requiere repensar los 5 estados de UI como resultado de un render condicional server-side
C. Híbrido — Server Component para el caso feliz (redirect inmediato tras aceptar) + client `useMutation` solo para el camino de reintento en caso de error
X. Other (please specify)

[Answer]: A. useMutation (client component) con guard anti-doble-disparo — mantiene la página como client component, patrón similar a useNotifications()

## Q3: Estructura de `onboarding/page.tsx` tras la migración

`onboarding/page.tsx` es un wizard multi-step con estado de cliente (`useState`). Al convertir el `useEffect` de mount a `useQuery`, ¿mantenemos todo el wizard como client component, o separamos el fetch inicial en un Server Component?

A. Mantener todo el wizard como client component; solo el fetch de mount pasa de `useEffect` a `useQuery` — cambio mínimo, mismo árbol de componentes
B. Separar: un Server Component hace el fetch inicial de `getMyOrganization()` y pasa el resultado como prop inicial; el wizard interactivo (pasos, `handleStep1`, `completeSetup`) sigue siendo client component
X. Other (please specify)

[Answer]: A. Mantener todo el wizard como client component; solo el fetch de mount pasa de useEffect a useQuery

## Q4: Manejo de errores — ¿aplicar ya la convención tipada afirmada, o preservar el shape mínimo?

A. Preservar `ApiError` tal cual está (lo mínimo necesario para no romper el branching de `invite/[token]/page.tsx`) — no construir la jerarquía de excepciones tipadas completa en este bugfix; queda como deuda para un intent dedicado a la convención Q6
B. Empezar a aplicar en este bugfix el patrón ya afirmado por el equipo (Q6 de `team.md`): crear una jerarquía mínima de excepciones tipadas para `orgApi`/`teamApi` (equivalente a `OrgDomainException`/`AuthDomainException` del backend) + manejo centralizado, ya que este es el primer punto de contacto natural para esa convención
X. Other (please specify)

[Answer]: A. Preservar ApiError tal cual está — la jerarquía tipada completa queda como deuda para un intent dedicado a la convención Q6

## Consolidated Summary Confirmation

- Alcance del fix: solo los `useEffect` de mount (`checkSetup`/`getMyOrganization` en `onboarding/page.tsx`, `acceptInvitation` en `invite/[token]/page.tsx`) — `handleStep1`/`completeSetup` de onboarding quedan como llamadas imperativas tal cual, sin tocar; el gap de `fetchWithAuth` en `orgApi.ts`/`teamApi.ts` queda fuera de alcance de este bugfix (deuda documentada, no se cierra acá)
- `invite/[token]/page.tsx`: se migra a `useMutation` (client component) con guard anti-doble-disparo, preservando el shape de `ApiError` para que el branching de error (expirado/ya-miembro/401) siga funcionando igual que hoy
- `onboarding/page.tsx`: se migra el fetch de mount a `useQuery`; el resto del wizard sigue siendo client component, sin separar en Server Component
- Manejo de errores: se preserva `ApiError` tal cual está en esta migración; NO se construye la jerarquía de excepciones tipadas + manejo centralizado que el equipo afirmó como convención hacia adelante (Q6 de `team.md`) — queda como deuda para un intent dedicado
- Test: ambas páginas no tienen tests hoy — la migración requiere escribir tests nuevos (unit/component, Vitest + Testing Library) para el comportamiento migrado, consistente con la postura de testing del scope `bugfix` (regresión dirigida + suite existente en verde)

- Looks correct
- Request changes

[Answer]: Looks correct
