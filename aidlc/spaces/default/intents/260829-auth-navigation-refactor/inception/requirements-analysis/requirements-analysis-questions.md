# Requirements Analysis — Preguntas

Petición original del usuario (verbatim): "Refactor de navegación Auth y eliminación de supresores de ESLint en redirecciones OAuth y fetchWithAuth"

El scan enfocado de Reverse Engineering y la entrevista de Practices Discovery ya resolvieron la mayoría de las ambigüedades técnicas (ver `codekb/prosell-sass/architecture.md` § Interaction Diagrams #3 y `code-quality-assessment.md`). Estas preguntas cubren solo lo que queda genuinamente abierto para poder generar `requirements.md`.

## Q1 — Alcance de "eliminación de supresores de ESLint"

Hay 5 `eslint-disable @next/next/no-location-assign-relative-destination` en el área tocada: 1 en `fetchWithAuth.ts` (redirect por sesión expirada) y 4 duplicados (2 en `LoginPageContent.tsx`, 2 en `RegisterPageContent.tsx`, mismo patrón de redirect OAuth repetido). El flujo OAuth2 necesita genuinamente una navegación completa del navegador (`window.location.href`), no un link interno de Next.js — así que la regla de lint puede seguir aplicando aunque se refactorice el código. ¿Qué significa "eliminación" acá?

A. Consolidar los 4 duplicados de OAuth en un único helper compartido (5 supresores → 2: uno en el helper, uno en fetchWithAuth) — reducir la duplicación, no necesariamente llegar a cero supresores
B. Llegar a cero supresores de ESLint en el área, aunque eso requiera una construcción de URL/redirect alternativa que satisfaga la regla de lint sin perder la navegación completa del navegador
C. Solo consolidar el helper compartido de OAuth (como A), dejando fetchWithAuth.ts sin tocar
X. Other (please specify)

[Answer]: B. Cero supresores

## Q2 — Código muerto `useOAuthPreload.ts`

Reverse Engineering encontró que `useOAuthPreload.ts` es código muerto: ningún import real lo referencia en `apps/web/src`, y además apunta a un componente inexistente (`@/components/auth/OAuthButtons`) — el componente OAuth real activo es `AuthOAuthButton` en `AuthShell.tsx`. Tiene su propio test que ejercita un hook nunca wireado a producción. ¿Entra en el alcance de este intent?

A. Sí, eliminar `useOAuthPreload.ts` y su test como parte de este refactor
B. No, dejarlo fuera de alcance — se trata en un intent de limpieza aparte más adelante
X. Other (please specify)

[Answer]: A. Sí, eliminar

## Q3 — Patrón de manejo de errores en frontend (adoptado en Practices Discovery)

En Practices Discovery el equipo afirmó adoptar un patrón de manejo de errores equivalente al del backend (excepciones tipadas por dominio + handler centralizado) en el frontend, como convención de equipo hacia adelante. Este intent toca exactamente el área (`proxy.ts`, `authStore.ts`, `useAuth.ts`, `fetchWithAuth.ts`) donde hoy no existe una taxonomía de error explícita (sesión expirada vs. credenciales inválidas vs. error de red). ¿Se implementa ese patrón ACÁ, en este refactor, o es una convención que se aplica recién cuando surja trabajo futuro en esta área?

A. Sí, implementar el patrón de errores tipados ahora, en los archivos que este intent ya toca
B. No, dejarlo para un intent futuro dedicado a esa migración — este intent se limita a navegación/ESLint
X. Other (please specify)

[Answer]: B. No, dejar para futuro

## Q4 — Cobertura de test para los botones OAuth

Los tests de `login`/`register` page no cubren hoy el `onClick` de los botones OAuth (0 menciones de "oauth") — exactamente las líneas que este intent va a tocar. La Testing Posture afirmada es test-after. ¿Agregamos cobertura de test para el nuevo helper/handler de OAuth como parte de este intent?

A. Sí, agregar tests unitarios/componente para el helper de redirect OAuth consolidado
B. No es necesario — el comportamiento externo no cambia lo suficiente como para ameritar test nuevo
X. Other (please specify)

[Answer]: A. Sí, agregar tests

## Q5 — Drift de JSDoc en `proxy.ts`

El JSDoc de cabecera de `proxy.ts` sigue diciendo "Next.js Middleware" pese a que el archivo fue renombrado desde `middleware.ts`. Es un fix de una línea dentro del mismo archivo que este intent ya toca. ¿Lo corregimos como parte de este refactor, o preferís que quede fuera y se trate aparte?

A. Sí, corregirlo de paso ya que se toca el archivo
B. No, dejarlo fuera de alcance de este intent
X. Other (please specify)

[Answer]: A. Sí, corregir

## Consolidated Summary Confirmation

- Q1 — Eliminación de supresores ESLint: buscar cero supresores en el área (fetchWithAuth.ts + helper OAuth consolidado), con una construcción alternativa que satisfaga la regla de lint sin perder la navegación completa del navegador.
- Q2 — `useOAuthPreload.ts`: eliminar el hook y su test como código muerto, dentro del alcance de este intent.
- Q3 — Patrón de errores tipados por dominio (afirmado en Practices Discovery): NO se implementa en este intent — queda como convención de equipo para trabajo futuro en esta área.
- Q4 — Cobertura de test: agregar tests unitarios/componente para el helper de redirect OAuth consolidado (hoy en 0% de cobertura).
- Q5 — JSDoc de `proxy.ts`: corregir la cabecera desactualizada ("Next.js Middleware" → refleja que es `proxy.ts`) de paso.

Does this all look correct before I generate the requirements artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
