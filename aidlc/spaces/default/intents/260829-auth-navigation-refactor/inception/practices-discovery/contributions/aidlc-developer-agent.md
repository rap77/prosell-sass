**Collaborator:** aidlc-developer-agent

## Contribution

Evaluación independiente enfocada en naming/estructura de archivos, layer
boundaries (Clean Architecture), manejo de errores y code style — con
foco específico en el área tocada por este intent (navegación auth:
`proxy.ts`, `authStore.ts`, `useAuth.ts`, `fetchWithAuth.ts`,
`NavigationCleanup.tsx`, `deriveRole.ts`, páginas de login/register).
Evidencia obtenida vía `graphify query` (Paso 0 mandatorio) sobre el grafo
AST existente, cruzada con `code-structure.md` y `architecture.md` del
codekb. No leí código fuente de aplicación directamente en este pase —
toda cita abajo viene del grafo o de los artefactos de codekb ya
producidos por reverse-engineering.

**Layer boundaries (backend, confirmado, no en discusión para este
intent):** la Dependency Rule `infrastructure → application → domain` se
sostiene de forma estricta y visible en el grafo — `domain/` (entidades,
value objects, excepciones, puertos) sin imports hacia afuera;
`application/` con use cases 1:1 por acción (`LoginUserUseCase`,
`ChangePasswordUseCase`, `Enable2FAUseCase`, `AcceptOrganizationInvitationUseCase`);
`infrastructure/` implementando los puertos vía DI (`dependencies.py` con
factories `get_*_use_case()`). Como este intent es de navegación
frontend, el backend probablemente queda fuera de scope — vale
confirmarlo explícitamente en la entrevista para no generar ambigüedad de
alcance.

**Manejo de errores (backend, patrón fuerte y reutilizable):** cada
dominio tiene su propio archivo de excepciones con una clase base
`<Dominio>DomainException` (`AuthDomainException`, `OrgDomainException`) y
subclases específicas (`InvalidCredentialsException`,
`UserNotFoundException`, `WeakPasswordException`, `Invalid2FACodeException`,
`OAuthConfigurationError`) — más un exception handler centralizado por
dominio (`auth_domain_exception_handler()` en `exception_handlers.py`) que
mapea la jerarquía de dominio a respuestas HTTP. Es un patrón consistente
y nombrado de forma predecible; el borrador del lead no lo menciona porque
su foco fue CI/CD/git, no código — correcto que quede fuera de su
draft, pero la entrevista debería registrar este patrón como convención
afirmada de code style/error handling, dado que es exactamente el tipo de
regla que el equipo va a querer preservar si el refactor de navegación
introduce manejo de errores nuevo en el lado cliente.

**Manejo de errores (frontend, gap real relevante a este intent):** no
encontré un equivalente cliente al patrón backend de arriba. `fetchWithAuth.ts`
tiene un `eslint-disable` justificado para redirect de sesión expirada
(`window.location.href`), pero no hay evidencia de una taxonomía de error
explícita (sesión expirada vs. credenciales inválidas vs. error de red) que
la navegación auth distinga de forma consistente entre `proxy.ts`,
`authStore.ts` y `useAuth.ts`. Si el refactor toca lógica de error de
navegación, la entrevista debería preguntar si el equipo quiere establecer
una convención explícita (tipo de error → acción de navegación) en vez de
manejarlo ad-hoc por archivo.

**Naming / organización de archivos — 3 hallazgos concretos del área del
intent:**

1. **Duplicación literal, no solo un `eslint-disable` repetido**:
   `LoginPageContent.tsx` y `RegisterPageContent.tsx` repiten línea por
   línea el mismo patrón de redirect OAuth
   (`window.location.href = \`${base}/api/auth/oauth/${provider}/authorize\``)
para Google y Microsoft, cada una con 2 `eslint-disable` idénticos (4
   en total). Esto es exactamente el tipo de duplicación que un refactor
   de navegación debería resolver extrayendo un helper compartido — vale
   confirmarlo como candidato de scope en la entrevista, no asumir que ya
   está cubierto.
2. **Código muerto con test propio**: `useOAuthPreload.ts` no tiene
   ningún import real en `apps/web/src` y referencia un import inexistente
   (`@/components/auth/OAuthButtons`) — el componente OAuth real activo es
   `AuthOAuthButton` dentro de `AuthShell.tsx`. Tiene un test dedicado
   (`useOAuthPreload.test.ts`) que ejercita código nunca wireado a
   producción — un falso positivo de cobertura. Si este refactor toca el
   flujo OAuth, es candidato directo a eliminación; si no lo toca, al
   menos debería registrarse como deuda conocida para no confundir al
   agente de código durante Code Generation.
3. **Drift de naming documentación vs. archivo**: `proxy.ts` fue renombrado
   desde `middleware.ts`, pero el JSDoc de cabecera sigue diciendo "Next.js
   Middleware" — divergencia menor pero exactamente el tipo de detalle que
   confunde a quien lee el archivo por primera vez. Vale mencionar en la
   entrevista si el rename fue deliberado (para evitar colisión con la
   convención Next.js de nombrar este archivo `middleware.ts`) o accidental,
   porque afecta si el refactor debe también actualizar el comentario.

**Patrón positivo a preservar**: `deriveRole.ts` está documentado
explícitamente in-line como single source of truth de derivación de rol,
compartido entre `proxy.ts` (server-side routing) y `authStore.ts`
(client-side state) — es el tipo de patrón de "una sola fuente de verdad
cruzando server/client boundary" que vale mantener y no duplicar durante
el refactor.

**Code style — gap en el borrador del lead**: `team-practices.md` del
lead cubre bien tooling (Ruff/Pyright/ESLint/Prettier, GGA, react-doctor)
pero no captura convenciones de naming/arquitectura a nivel de código
(la convención `<Dominio>DomainException`, la separación
store-Zustand/hook/lib-api-client en frontend, DTO boundary Pydantic/Zod).
Esto es esperable — el lead es pipeline-deploy, no developer — pero
significa que si la entrevista no las levanta explícitamente, quedan sin
afirmar en `team.md`/`project.md` pese a ser altamente relevantes para
este intent específico de refactor de código.

## Positions

- AGREE: La distinción que hace el borrador entre "TDD estricto declarado
  en memoria de usuario" vs. "test-after real evidenciado en el repo" es
  correcta y bien fundamentada — la cobertura frontend rebajada a 40% y el
  aprendizaje de `project.md` sobre no backfillear tests confirman
  test-after como práctica real, no TDD.
- AGREE: La confirmación de deploy-on-merge a staging + gate manual a
  producción coincide con lo que confirma el grafo de CI/CD; no tengo
  evidencia adicional de código que la contradiga.
- OBJECT: El borrador del lead no cubre naming/layer-boundary/error-handling
  a nivel de código (fuera de su alcance como pipeline-deploy), dejando un
  vacío real para este intent — la entrevista debería incorporar al menos
  una pregunta sobre si extraer el helper OAuth duplicado y/o eliminar
  `useOAuthPreload.ts` entran en el scope de este refactor, y si el equipo
  quiere afirmar una convención explícita de manejo de errores de
  navegación en el frontend (hoy inexistente, a diferencia del backend que
  sí tiene un patrón claro por dominio).
- OBJECT: El borrador no menciona el drift de naming `middleware.ts` →
  `proxy.ts` (JSDoc desactualizado) — es menor, pero al ser parte directa
  del área que este intent toca, vale que quede registrado en
  `evidence.md` para que Code Generation no lo pase por alto ni lo
  "arregle" sin que el equipo lo haya decidido explícitamente.

## Subagent Summary: Practices Discovery (Developer Review)

**Produced:**
`aidlc/spaces/default/intents/260829-auth-navigation-refactor/inception/practices-discovery/contributions/aidlc-developer-agent.md`

**Key Decisions:**

- Evaluación hecha vía graphify-first (2 queries sobre el grafo AST) +
  codekb existente (`code-structure.md`, `architecture.md`), sin releer
  código fuente de aplicación en este pase — consistente con la regla de
  proyecto de reservar lectura directa para literales exactos, contenido
  no indexado, o narrativa de negocio.
- Confirmado el patrón backend de error handling por dominio
  (`<Dominio>DomainException` + handler centralizado) como convención
  sólida y nombrable; identificado que el frontend carece de un
  equivalente para errores de navegación auth.
- Identificados 3 hallazgos concretos de naming/organización específicos
  del área de este intent (duplicación OAuth login/register, código muerto
  `useOAuthPreload.ts`, drift de JSDoc en `proxy.ts`).

**Issues/Concerns:**

- El borrador del lead no cubre code-style a nivel de código (esperado
  dado su rol), dejando gaps que esta contribución busca cerrar antes de
  la entrevista.
- `useOAuthPreload.ts` es un falso positivo de cobertura de test (ejercita
  código nunca wireado) — riesgo de que Code Generation lo trate como
  código vivo si no se aclara el scope.

**Next Steps:**

- Incorporar en la entrevista (Step 4) las preguntas de scope sobre el
  helper OAuth duplicado, `useOAuthPreload.ts`, y una convención de manejo
  de errores de navegación en frontend.
- Confirmar si el rename `middleware.ts` → `proxy.ts` fue deliberado.
