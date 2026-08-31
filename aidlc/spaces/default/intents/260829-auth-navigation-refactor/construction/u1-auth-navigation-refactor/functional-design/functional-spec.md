# Functional Spec — U1 (u1-auth-navigation-refactor)

> Unit `kind: ui`, sin `entities.md`/`rules.md` (no aplican por `produces_kinds` — sin entidades ni
> reglas de negocio nuevas). Este archivo es autocontenido: especifica el workflow de interacción y
> las transiciones de estado relevantes a partir de `unit-of-work.md` y `requirements.md`, sin
> dependencia de un modelo de entidades.

## Workflow: Redirect OAuth consolidado (FR1, FR2)

1. El usuario hace click en el botón "Continuar con Google" o "Continuar con Microsoft" en
   `LoginPageContent.tsx` o `RegisterPageContent.tsx`.
2. El `onClick` handler llama al nuevo helper `buildOAuthAuthorizeUrl(provider)` (Q1: función pura
   que construye y retorna la URL — no ejecuta el side-effect de navegación).
3. El handler de la página asigna `window.location.href = buildOAuthAuthorizeUrl(provider)`,
   disparando la navegación completa del navegador (sin cambio de comportamiento respecto a hoy —
   NFR3).
4. El navegador navega fuera del origen de la SPA hacia
   `${NEXT_PUBLIC_API_URL}/api/auth/oauth/{provider}/authorize` (backend FastAPI).
5. El backend redirige a Google/Microsoft; tras el consentimiento, el callback del backend sienta
   las cookies httpOnly (`access_token`, `refresh_token`) y redirige de vuelta al frontend.
6. En la siguiente navegación, `proxy.ts` (middleware) lee la cookie de sesión, resuelve el rol vía
   `deriveRole.ts`, y permite o redirige según `PROTECTED_ROUTES`/`PUBLIC_ROUTES`/`AUTH_REDIRECT_ROUTES`.
7. `authStore.ts` hidrata la sesión (`login`/`mapApiUserToStoreUser`), usando el mismo
   `deriveRole.ts` que `proxy.ts` para mantener el rol consistente.

Este workflow es idéntico al ya documentado en `codekb/prosell-sass/architecture.md` §
Interaction Diagram #3 — el refactor consolida DÓNDE se construye la URL (helper compartido en vez
de duplicada), no CÓMO funciona el flujo. Ningún paso de este workflow cambia para el usuario
final (NFR3).

## Workflow: Redirect por sesión expirada (FR2, `fetchWithAuth.ts`)

1. Un componente cliente llama a `fetchWithAuth()` para una petición autenticada.
2. Si la respuesta indica sesión expirada (401 o equivalente), `fetchWithAuth.ts` redirige el
   navegador a la pantalla de login — hoy vía `window.location.href` directo, con su propio
   `eslint-disable`.
3. FR2 busca que esta construcción de URL también quede libre de supresor de ESLint, sin cambiar el
   comportamiento observable (sigue siendo una navegación completa del navegador, no un
   `router.push` interno — un logout forzado por sesión expirada debe limpiar el contexto de
   navegación completo, no solo el estado de React).

## Workflow: Cobertura de test nueva (FR5)

Los tests de `login`/`register` page se extienden para cubrir el `onClick` de ambos botones OAuth
(Google y Microsoft), verificando que invocan `buildOAuthAuthorizeUrl(provider)` con el provider
correcto y que el resultado se asigna a `window.location.href`. No requiere mockear la navegación
del navegador en sí (Q1 evita eso) — solo verificar que el handler llama al helper con el argumento
correcto y usa su valor de retorno.

## Eliminaciones (FR3, FR4) — sin workflow nuevo

- `useOAuthPreload.ts` se elimina completo (código muerto, sin workflow que documentar).
- El JSDoc de cabecera de `proxy.ts` se corrige (cambio de documentación, no de comportamiento).

## Edge Cases / Error Handling

- **Provider inválido**: `buildOAuthAuthorizeUrl` recibe un `provider` tipado (`'google' |
'microsoft'`) en TypeScript — un valor fuera de ese union es un error de compilación, no un caso
  de runtime a manejar explícitamente en este Unit (fuera de alcance: no se implementa el patrón de
  errores tipados por dominio en este intent, ver `requirements.md` § Constraints).
- **`NEXT_PUBLIC_API_URL` no configurado**: comportamiento fuera de alcance — ya existente hoy,
  este refactor no lo cambia ni lo empeora ni lo mejora.

## State Transitions

Ninguna — este Unit no introduce ni modifica ningún lifecycle de entidad. La "transición" real es
de navegador (SPA → origen externo → callback → SPA), ya cubierta en el Workflow de arriba, no una
transición de estado de una entidad de dominio.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-29T21:09:53Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                                                                                      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Recommendation                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Major    | functional-spec.md § Workflow: Cobertura de test nueva (FR5) / § Workflow: Redirect por sesión expirada (FR2) | Verifiqué en código (`fetchWithAuth.ts:37-38`) que FR2.1 también modifica la construcción de la URL de redirect en `fetchWithAuth.ts` (el 5º supresor de ESLint, distinto de los 4 en Login/RegisterPageContent). El workflow FR5 documentado solo especifica cobertura de test para los botones OAuth de login/register — ningún workflow de este archivo asigna una verificación de test equivalente al cambio en `fetchWithAuth.ts`. Esto repite, sin cerrarlo, el mismo gap que el reviewer de Units Generation ya señaló como hallazgo #3 en `unit-of-work.md` ("confirmar en Code Generation/Build and Test que el cambio de `fetchWithAuth.ts` recibe verificación equivalente aunque no esté nombrado en FR5"). Functional Design era la etapa natural para cerrar esa nota agregando un workflow de test explícito (aunque fuera mínimo) para la rama de sesión expirada; en cambio, la nota queda otra vez implícita, dependiendo de que Code Generation la recuerde sin un artefacto que se lo exija. | Agregar un tercer punto al workflow de FR5 (o un workflow de test separado) que cubra explícitamente la construcción de URL de `fetchWithAuth.ts` tras el cambio de FR2.1 — aunque sea "verificar que el redirect de sesión expirada sigue apuntando a `/auth/login`" — para que quede trazado en `functional-spec.md` y no solo en la memoria de reviews previas. |
| 2   | Minor    | traceability.json                                                                                             | El esquema de ejemplo del stage file usa `status: OK/GAP` a nivel de AC con `target: BRx.y`, y reserva `status: N/A` para el array `reverse` (reglas sin AC). Acá, al no existir `entities.md`/`rules.md` por diseño (`kind: ui`), los 5 FR se registran directamente como `upstream_ids` con `status: N/A` apuntando a secciones de `functional-spec.md` en vez de a `BRx.y` — una adaptación razonable dado que no hay reglas que targetear, y está explicada en la cabecera del propio `functional-spec.md`. No verifiqué si el sensor `traceability` reconoce `N/A` como valor válido de `coverage[].status` a nivel FR (el ejemplo del stage solo lo muestra en `reverse[]`) — si el sensor lo rechaza mecánicamente, sería un falso positivo de la herramienta contra un diseño legítimamente adaptado, no un defecto del diseño en sí.                                                                                                                                                                    | Confirmar tras el primer run del sensor `traceability` sobre este artefacto que `N/A` a nivel de coverage FR no dispara `SENSOR_FAILED`; si lo hace, es un gap del sensor para unidades `kind: ui` sin rules.md, no del `functional-spec.md`.                                                                                                                      |
| 3   | Minor    | functional-spec.md (general)                                                                                  | El artefacto no menciona explícitamente la ausencia de `components.md` (domain-design fue saltado para este refactor, según confirma la review de `unit-of-work.md`), pese a que `components` es un `consumes` requerido (`required: true`) de este stage. El Step 2 del stage file autoriza explícitamente trabajar sin un input ausente por diseño ("Never invent the content of a missing artifact"), así que esto no es un defecto de completitud — pero una línea breve reconociendo la ausencia (como ya hace la cabecera para `entities.md`/`rules.md`) cerraría cualquier duda del sensor `upstream-coverage` sobre por qué `components` no aparece referenciado.                                                                                                                                                                                                                                                                                                                                        | Opcional: agregar una línea en la cabecera reconociendo que `components.md` no existe (Domain Design saltado) y que este Unit no depende de un componente de dominio preexistente.                                                                                                                                                                                 |

### Validation Tool Results

No se listan herramientas de validación automatizadas fuera de los sensores declarados en el frontmatter (`required-sections`, `upstream-coverage`, `linter`, `type-check`, `traceability`), que corren aparte de este pase advisory. Verificación manual realizada en su lugar:

| Check                                                                                                                                                               | Resultado                                                                                                                | Interpretación                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los 5 supresores de ESLint citados en `requirements.md`/`unit-of-work.md` existen en el código real                                                                 | PASS (`rg` sobre los 3 archivos)                                                                                         | 2 en `LoginPageContent.tsx` (L182, L194), 2 en `RegisterPageContent.tsx` (L149, L161), 1 en `fetchWithAuth.ts` (L37) — coincide exactamente con el conteo de FR2/unit-of-work.md.                         |
| `buildOAuthAuthorizeUrl` (Q1, opción A) es coherente con FR1/NFR3                                                                                                   | PASS                                                                                                                     | Función pura que retorna URL, sin ejecutar el side-effect — separa construcción de navegación, no cambia el comportamiento observable del flujo (mismo destino, misma navegación completa del navegador). |
| Workflow de redirect OAuth coincide con el flujo real (login/register → helper → `window.location.href` → backend → callback → cookies → `proxy.ts`/`authStore.ts`) | PASS (razonamiento sobre el código citado + `codekb/prosell-sass/architecture.md` § Interaction Diagram #3 referenciado) | El refactor documentado es de ubicación (dedup), no de comportamiento — consistente con NFR3.                                                                                                             |
| Cobertura FR1-FR5 en traceability.json                                                                                                                              | PASS con nota (ver hallazgo #2)                                                                                          | Los 5 FR están presentes; ningún FR de `requirements.md` queda sin entrada.                                                                                                                               |

### Summary

El diseño es coherente con FR1-FR5/NFR1-NFR3: el helper `buildOAuthAuthorizeUrl` como función pura (Q1) separa correctamente construcción de URL y efecto de navegación, preserva la navegación completa del navegador que OAuth2 requiere (NFR3), y el workflow documentado coincide con el comportamiento real verificado en código. La adaptación de `traceability.json` para un Unit `kind: ui` sin `entities.md`/`rules.md` es razonable y está bien explicada, aunque no verificable al 100% contra el comportamiento del sensor `traceability` sin correrlo. El hallazgo Major es una repetición no resuelta de un gap ya señalado en la revisión de `unit-of-work.md`: el cambio de FR2.1 en `fetchWithAuth.ts` sigue sin un workflow de test explícito en este artefacto, aunque FR5 cubre bien los botones OAuth de login/register. Ninguno de los hallazgos es un defecto arquitectónico bloqueante — son gaps de trazabilidad/documentación para que el humano decida si cerrarlos ahora o dejarlos para Code Generation.
