# RBAC Permission Engine — Workbook de ejecución

> **Última actualización**: 2026-10-05
> Este archivo es SOLO progreso (qué está hecho, en curso, o pendiente). El
> "por qué" de cada decisión vive en
> [`rbac-security-profiles-diagnostic-2026-10-05.md`](rbac-security-profiles-diagnostic-2026-10-05.md)
> — no duplicar razonamiento acá, solo estado. Convención de status igual a
> `docs/technical-debt/README.md` (🔴 Not started / 🟡 In Progress / ✅ Done).
> Se actualiza después de cada paso concreto terminado, no al cierre de la
> sesión.
>
> No se está usando `/aidlc` para este trabajo (decisión explícita del
> usuario — demasiada ceremonia para el tamaño real) — este workbook es el
> reemplazo liviano de ese tracking, no un sustituto de las etapas de AIDLC.

---

## Reglas de ejecución (por cada ítem del checklist, sin excepción)

1. **Re-verificar el código real antes de implementar** — el diagnóstico es de
   hoy, pero el código pudo cambiar. No asumir que sigue vigente sin un
   grep/read rápido.
2. **Cambio más chico que resuelve ese ítem puntual** — no adelantar trabajo
   de un ítem futuro del checklist "porque ya estaba ahí".
3. **Test de regresión si toca scoping de tenant/org** — no negociable, dado
   el historial de 3 leaks cross-tenant reales esta semana. Sin esto, el
   ítem no se marca ✅ aunque "funcione a simple vista".
4. **Correr la suite existente relevante, no solo lo tocado** — mismo
   criterio ya aprendido varias veces en este proyecto (una regresión puede
   aparecer en un archivo que no editaste).
5. **Nada nuevo va directo a producción** — se prueba primero en staging,
   con verificación independiente (no confiar en el mensaje de "listo" del
   propio script/comando — re-consultar la DB/storage real aparte, como se
   hizo con el borrado de catálogo).
6. **Arreglar TODO hallazgo de GGA en archivos tocados**, aunque sea
   preexistente y no relacionado — mandate ya vigente del proyecto
   (`project.md` § Mandated), no es nuevo acá, solo se reafirma.
7. **Si aparece algo fuera del alcance del ítem actual, se anota aparte — no
   se resuelve de oficio ni se expande el alcance en silencio.**
8. **Marcar el ítem ✅ en este archivo INMEDIATAMENTE al terminarlo**, no al
   cierre de la sesión — y solo cuando: código + test + verificado en
   staging + (si aplica) desplegado. Nunca antes.
9. **No empezar el siguiente bloque hasta que el bloque actual esté 100% ✅.**
10. **Commits**: Conventional Commits, nunca `--no-verify`, nunca
    `Co-Authored-By` — y solo cuando el usuario lo pida explícitamente (no
    commitear de oficio al terminar un ítem).
11. **SOLID/DRY/patrones — aplicar lo ya decidido en §6.4 del diagnóstico, no
    reinventar en el momento de implementar**:
    - _Open/Closed_: una zona/acción nueva es una fila de dato, nunca un
      `if`/`elif` nuevo en el motor de chequeo.
    - _Dependency Inversion_: el dominio define el puerto
      (`IPermissionChecker`), la infra lo implementa — ningún router llama
      directo a SQLAlchemy para chequear un permiso.
    - _Liskov_: los 6 roles fijos de hoy se migran como perfiles-plantilla,
      sin camino de código especial (`if role_type == X`) en ningún lado.
    - _Interface Segregation_: repositorios separados por responsabilidad
      (`profile_grants` vs `profile_scope`), no un repositorio-dios.
    - _Specification pattern_ para alcance (`OwnScope`/`AllScope`/
      `ExplicitOrgsScope`), nunca un `if scope == "all" elif...` esparcido.
    - _DRY real_ = reusar lo que ya existe en el repo antes de escribir algo
      nuevo (mismo criterio ya aplicado esta sesión: `DOSpacesService`,
      `storage_key_sanitizer.py`) — si una abstracción ya resuelve el
      problema, no se duplica ni se versiona aparte "por las dudas".
    - Ninguna abstracción nueva para un caso de uso único — si un ítem del
      checklist no la necesita todavía, no se adelanta (ya cubierto por la
      regla 2, se reafirma acá para el contexto de patrones específicamente).

---

## Estado general

| Bloque | Descripción                                                                           | Estado                                                                     |
| ------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1      | Fix leak público (`tenant_id`/`organization_id`)                                      | ✅ Done (deploy a staging via CI, prod sin promover a propósito)           |
| 2      | Motor central Zona × Acción × Alcance                                                 | ✅ Done (2026-10-06) — 57/57 call sites migrados, verificado en staging    |
| 3      | UI de admin para perfiles                                                             | 🟡 In Progress (2026-10-07) — 2/7 ítems (3.0, 3.1), TDD estricto desde acá |
| 4      | Zona Leads/CRM + catálogo público/landing                                             | 🔴 Not started                                                             |
| 5      | UI de gestión `product_fb_account_assignments` / `OrganizationMarketplaceAccessModel` | 🔴 Not started                                                             |

Orden de ejecución y por qué: ver mensaje de la sesión 2026-10-05 — resumen:
1 (sin dependencias) → 2 (todo lo demás depende de esto) → 3 (sin UI el motor
no es usable) → 4 y 5 (prioridad de negocio, en paralelo entre sí).

---

## Bloque 1 — Fix leak público (§4 del diagnóstico)

- [x] Excluir `tenant_id`/`organization_id` de `PublicProductResponse` (2026-10-06) —
      ampliado en el momento a `org_code`/`org_color`/`fb_account_ids` también
      (mismo defecto, no estaban en el §4 original porque ese grep solo buscó
      `tenant_id`/`organization_id` textualmente; estos tres no tenían valor real
      filtrado hoy — siempre eran `null`/`[]` en el DTO público — pero quedaban
      ahí por descuido de herencia, no por diseño). Refactor: nueva clase base
      `_ProductPublicSafeResponse` (solo campos públicos); `ProductResponse` y
      `PublicProductResponse` extienden esa base por separado — `PublicProductResponse`
      ya NO hereda de `ProductResponse`, así que un campo sensible nuevo no puede
      filtrarse por accidente de herencia otra vez.
- [x] Test de regresión (2026-10-06) — `test_public_product_response_has_no_tenant_or_organization_identifiers`
      en `test_public_product_router_contact.py`, assertion estructural sobre
      `model_fields` (mismo patrón ya usado para el teléfono).
- [x] Verificar en staging (2026-10-06) — suite completa backend (1852 passed,
      0 failed) + integración real del router (10/10) + typecheck/eslint/tests
      frontend limpios + curl real contra `prosell-staging-api` con un producto
      de prueba insertado y borrado después: confirmado 0 campos sensibles en el
      JSON real devuelto.
- [x] Commit + push (2026-10-06) — dos commits en `main`
      (`0fca068` fix, `c3029c60` docs), pusheados a `origin/main`
      (`48cf34a2..c3029c60`). Pre-push corrió ruff/pyright/prettier + la
      suite completa de pytest, todo verde. **Deploy a staging ocurre
      automático vía CI al mergear a `main`** (ya en curso); **producción
      NO se promueve** — decisión explícita del usuario, pendiente para
      más adelante.
  - GGA encontró en el commit del fix un hallazgo real que yo no había
    visto en la re-verificación manual: `submitted_by`/`approved_by`
    (UUIDs reales de usuario) y `rejection_reason` (texto real de
    moderación) también se estaban filtrando — con valores reales, no
    `null` como `org_code`/`org_color`/`fb_account_ids`. Se corrigió en
    el mismo bloque antes de reintentar el commit — la regla 6 funcionó
    como red de seguridad real, no solo como ítem de checklist.

## Bloque 2 — Motor central (§6 del diagnóstico)

- [x] Migraciones (2026-10-06) — **refinamiento real vs. lo escrito en §6.2**:
      `permission_profiles`/`user_profile_assignments` NO se crearon — ya
      existían como `roles`/`user_roles` (tenant_id nullable, is_system_role,
      y `User.has_permission()` ya itera `self.roles` con semántica de unión).
      Solo 3 tablas nuevas, renombradas para calzar con `roles`:
      `role_grants`, `role_scope`, `role_organization_access`. Migración
      `20261006_0001` (relaja `roles.role_type` a nullable + índice único
      parcial, agrega las 3 tablas) — probada upgrade+downgrade+upgrade contra
      Postgres real, suite completa backend (2535 passed), y aplicada en
      staging real (reinicio de contenedor, logs limpios, 6 roles de sistema
      siguen con su `role_type` intacto). Detalle completo y por qué del
      refinamiento: diagnóstico §6.2.
  - [x] Commit + push (2026-10-06) — confirmado por el usuario. Dos commits:
        `9ff545b` (feat, incluye un ripple real que pyright atrapó:
        `get_user_roles()` asumía `role_type` siempre no-nulo y hubiera
        crasheado con un perfil custom — arreglado filtrando `None`, no
        solo relajando el tipo) y `59d80efb` (docs). Pusheado a `main`
        (`c3029c60..59d80efb`).
  - ⚠️ Hallazgo aparte para el próximo ítem: staging tiene 7 roles de
    sistema, no 6 (`vendedor` además de `sales_agent`) — investigar antes
    de asumir "6 roles fijos" literal en el siguiente paso.
- [x] Domain: entidad `PermissionProfile` + specification objects de alcance
      (2026-10-06) — **refinamiento igual que en migraciones**: no se creó
      `PermissionProfile` aparte, se extendió `Role` (`grants: list[RoleGrant]`,
      `scope: OwnScope | AllScope | ExplicitOrgsScope | None`, método
      `has_zone_action(zone, action)`). Nuevos value objects
      `RoleGrant` (`domain/value_objects/role_grant.py`) y
      `OwnScope`/`AllScope`/`ExplicitOrgsScope` (`domain/value_objects/permission_scope.py`,
      Specification pattern vía `Protocol` + `@runtime_checkable`, sin ABC —
      evita el choque de metaclases Pydantic+ABCMeta). 19 tests nuevos,
      todos pasando. `has_permission()`/`get_permissions()` (el camino viejo
      de `ROLE_PERMISSIONS`) quedaron intactos — `has_zone_action()` es
      paralelo, todavía no wireado a ningún endpoint real (eso es el ítem
      del dependency, más abajo).
  - ⚠️ **Ripple real encontrado por la suite completa** (regla 4 — nunca
    confiar en "pasó el archivo nuevo"): agregar `grants`/`scope` como
    campos de `Role` con el MISMO nombre que las relationships lazy de
    `RoleModel` rompió `_to_entity()` — `from_attributes=True` intentaba
    leer la relationship fuera de contexto async (`MissingGreenlet`).
    Atrapado por 3 tests de integración reales (no por los tests nuevos
    en sí). Fix: `_to_entity()` construye `Role` explícito en vez de
    reflexión automática — mismo principio que ya se aplicó con
    `get_user_roles()` en el ítem anterior: un campo nuevo en el dominio
    puede romper un mapeo ORM↔dominio existente sin tocar ese archivo
    directamente. Verificado con la suite completa (2554 passed) Y login
    real contra `prosell-staging-api` (JWT con `roles` cargados sin crash).
- [x] Servicio de anti-escalación (2026-10-06) —
      `domain/services/permission_escalation_guard.py` (`ensure_no_grant_escalation`) + `domain/exceptions/role_exceptions.py` (`PermissionEscalationException`).
      Pura lógica de dominio, sin tocar repositorios/DB — compara el set
      de grants pedidos contra `granter.has_zone_action()` uno por uno,
      reporta exactamente cuáles de los pedidos escalan (no todo-o-nada).
      6 tests nuevos, suite completa sin ripple esta vez (2560 passed) —
      a diferencia de los dos ítems anteriores, este no colisiona con
      ningún mapeo ORM existente.
  - ⚠️ **Alcance deliberadamente acotado, documentado en el propio
    archivo**: esto SOLO chequea escalación de la matriz zona×acción.
    Escalación de **alcance** (ej. un actor con `ExplicitOrgsScope`
    otorgando `AllScope` a otro rol) queda explícitamente sin resolver —
    comparar dos `Scope` para "cuál es más permisivo" no tiene una
    respuesta pura de dominio cuando uno de los dos es `OwnScope`
    (su set permitido depende de quién pregunta, no es un set fijo
    comparable). No lo resolví por mi cuenta — queda como pregunta
    abierta para el ítem del dependency (`require_zone_action`), que sí
    tiene contexto de request para resolverlo.
  - Sin verificación en staging — no aplica: nada todavía llama a este
    servicio desde un endpoint real, no hay comportamiento vivo que
    comprobar más allá de los tests unitarios.
- [x] Dependency `require_zone_action(zone, action)` — **construido y
      testeado, pero NO migrado a ningún router todavía** (desglosado
      abajo, no es lo mismo):
  - [x] `AbstractRoleRepository.get_user_roles_with_grants()` nuevo —
        paralelo a `get_user_roles()` (que sigue devolviendo
        grants=[]/scope=None, sin tocar), con `selectinload()` explícito
        en las 3 relationships para no repetir el bug de `MissingGreenlet`
        de los ítems anteriores. Mapea `role_scope.scope_type` a
        `OwnScope`/`AllScope`/`ExplicitOrgsScope` (con
        `role_organization_access` para el caso explícito).
  - [x] `require_zone_action()` en `dependencies.py`, mismo patrón que
        `require_permission()` ya existente — verifica unión sobre todos
        los roles del usuario (`any(role.has_zone_action(...))`).
  - [x] Tests: 4 de integración nuevos (sesión async real, los 3 tipos de
        scope + el caso sin filas) + 5 unitarios del dependency (fake repo,
        sin DB). Suite completa sin ripple (2569 passed). Verificado en
        staging real: reinicio de contenedor + login real sigue
        funcionando (nada roto en el arranque de la app).
  - [x] **Re-verificado (regla 1) antes de migrar routers — el tamaño real
        no era "+5"**: `rg` real sobre el repo encontró **32 call sites**,
        no 5: 1 `require_permission(Permission.ORG_CREATE)`, 1
        `has_permission(Permission.MARKETPLACE_PUBLISH)` inline, y **30
        `has_permission(Permission.ORG_ADMIN_VIEW_ALL)` inline** (27 solo
        en `product_router.py`). De esos 30, ninguno migra a
        `require_zone_action` — `ORG_ADMIN_VIEW_ALL` nunca fue un permiso
        de acción, siempre fue un alcance de visibilidad disfrazado de
        `Permission` (ya mapeado así en la migración `20261006_0002`,
        `role_scope.scope_type='all'`, no un grant). Hacía falta una pieza
        nueva que todavía no existía.
  - [x] Pregunta real, confirmada con el usuario (2026-10-06): para un
        usuario con más de un rol, ¿cómo se combina el alcance de cada
        uno? Respuesta: **el más permisivo gana** (`AllScope` >
        `ExplicitOrgsScope` > `OwnScope`), mismo criterio de unión que ya
        usan `has_permission()`/`has_zone_action()`.
  - [x] `domain/services/scope_resolver.py` (`resolve_effective_scope`) —
        pura lógica de dominio, 10 tests. `get_effective_scope()` nuevo en
        `dependencies.py` — dependency que carga roles vía
        `get_user_roles_with_grants()` (no la versión plana) y resuelve el
        alcance efectivo. 3 tests nuevos — encontré y corregí un detalle
        real de tipos al escribirlos: el fake repo de
        `test_require_zone_action.py` "pasaba" pyright solo porque
        `require_zone_action()` devuelve `Callable[..., Awaitable[User]]`
        (los `...` apagan el chequeo de argumentos) — `get_effective_scope`
        se llama directo con su firma real, así que su fake repo necesitó
        implementar el Protocol completo de verdad. Suite completa: 2573
        passed. Verificado en staging real (reinicio + login).
  - [~] **EN CURSO — el número real es 57, no 32** (corregido dos veces al
    reverificar archivo por archivo — ver "Estado exacto" abajo).
    2/57 migrados (`org_router.py`). Los 2 patrones de migración ya
    están resueltos y probados — lo que queda es mecánico, archivo
    por archivo, con la misma verificación de siempre.

### Estado EXACTO de la migración de call sites (bloque 2, último ítem) — leer esto primero al retomar

**Por qué existen 57 (no es un bug, es falta de un punto central)**: cada
endpoint que necesita saber "¿este usuario ve todas las organizaciones o
solo la suya?" (`ORG_ADMIN_VIEW_ALL`) o "¿puede publicar en marketplace?"
(`MARKETPLACE_PUBLISH`) lo recalcula por su cuenta, copiado — no hay
middleware ni dependency central (§1.2 del diagnóstico). Migrar esto NO
arregla un bug de seguridad — el comportamiento HOY es correcto. Lo que
hace: (1) centraliza la lógica en un solo lugar testeado, (2) **es lo que
"prende" el motor nuevo para que tenga efecto real** — sin esto, un
perfil personalizado con `ExplicitOrgsScope` configurado en el bloque 3
sería ignorado por la API, porque estos 57 call sites seguirían
preguntando `has_permission(ORG_ADMIN_VIEW_ALL)`, que un perfil custom
nunca puede tener.

**Los 2 patrones de migración, ya probados en `org_router.py` (regla 11,
reusar, no reinventar por archivo)**:

1. **Chequeo de acción** (via helper tipo `_require_marketplace_publish(current_user)`
   que llama `has_permission()` y lanza 403): cambiar la fuente del
   `Depends()` de `current_user` de la auth dependency actual a
   `require_zone_action(zone, action)`, y borrar la llamada al helper
   dentro del cuerpo — ya no hace falta, frena antes de entrar a la
   función.
2. **Chequeo de alcance** (`is_org_admin`/`can_view_all_orgs = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)`,
   usado DESPUÉS en lógica condicional, no para bloquear de entrada):
   agregar `effective_scope: Annotated[AllScope | ExplicitOrgsScope | OwnScope, Depends(get_effective_scope)]`
   a la firma, cambiar la línea a `isinstance(effective_scope, AllScope)` —
   mismo nombre de variable, cero cambios más abajo en la función.

**Mapeo de Permission → (zone, action)** (mismo del seed `20261006_0002`):
`Permission.ORG_CREATE` → `("organizations", "create")`.
`Permission.MARKETPLACE_PUBLISH` → `("marketplace", "publish")`.
`Permission.ORG_ADMIN_VIEW_ALL` → NO es un grant, es
`isinstance(effective_scope, AllScope)`.

**Checklist real, archivo por archivo** (57 total, verificado por grep
exhaustivo cruzado — patrón literal + nombres de función helper + grep
sobre TODOS los routers, no solo el patrón obvio):

- [x] `org_router.py` — 2/2 migrados (1 acción `ORG_CREATE`, 1 alcance
      `ORG_ADMIN_VIEW_ALL` en `list_organizations`). Lint/pyright/suite
      completa (2573 passed)/staging verificados. **3 tests rotos y
      arreglados en el camino**: el fixture compartido
      `mock_role_repo_super_admin` (`tests/integration/test_organization_api.py`)
      solo mockeaba `get_user_roles()` (el método viejo) — crasheaba con
      `TypeError: object MagicMock can't be used in 'await' expression`
      en cuanto un endpoint migrado llamaba a `get_user_roles_with_grants()`.
      Arreglado en la fuente del fixture (afecta a los ~13 tests que lo
      usan, no solo los 3 que fallaron), + un test suelto
      (`test_super_admin_sees_all_orgs_no_tenant_filter`) que no usaba el
      fixture compartido, arreglado overrideando `get_effective_scope`
      directo.
- [x] `org_verticals_router.py` — 1/1 migrado (alcance `ORG_ADMIN_VIEW_ALL`
      en `list_org_verticals`, vía el mismo alias nombrado
      `get_cookie_effective_scope` que ya usa `org_router.py`). Lint/pyright/
      suite completa (2573 passed)/staging verificados con request real
      (login real + `GET /organizations/{id}/verticals`, 200 con datos
      reales — antes 422).

  - 🔴 **Bug real encontrado y arreglado al migrar este archivo, severidad
    alta — afecta además a `org_router.py` YA migrado antes (committeado
    en `86320bc3`)**: `require_zone_action`/`get_effective_scope` en
    `dependencies.py` tenían hardcodeado internamente
    `Depends(get_current_auth_user)` (auth por **Bearer token**). Pero 3 de
    los 4 routers reales que necesitan este engine (`org_router.py`,
    `org_verticals_router.py`, `admin_organizations_router.py`, y
    `product_router.py`) autentican por **cookie httpOnly**
    (`get_current_auth_user_from_cookie`) — los dos mecanismos NO son
    intercambiables. Esto significa que `list_organizations` en
    `org_router.py`, ya pusheado a `main`, tenía un 401 latente en
    producción real para cualquier request autenticado solo por cookie (el
    camino real del frontend) — enmascarado en tests porque el fixture
    compartido overrideaba ambos mecanismos de auth a la vez, así que
    nunca se ejecutó el `Depends()` interno real.
    **Fix**: ambas factories ahora exigen `auth_dependency` como parámetro
    **obligatorio** (sin default) — cada router pasa explícitamente cuál
    de los dos mecanismos usa. Para que los tests puedan seguir
    overrideando exactamente el callable que FastAPI resuelve en runtime,
    cada router expone un alias nombrado a nivel de módulo (ej.
    `get_cookie_effective_scope = get_effective_scope(auth_dependency=get_current_auth_user_from_cookie)`)
    en vez de construir el dependency inline en la firma del endpoint.
  - 🔴 **Segundo bug, encadenado al anterior, encontrado recién al intentar
    probar el fix en vivo**: tras parametrizar `auth_dependency`, la
    request real a `org_verticals_router.py` empezó a fallar con
    `422 Unprocessable Entity` / `{"detail":[{"type":"missing","loc":["query","current_user"],...}]}`
    — FastAPI trataba `current_user` como un query param obligatorio, no
    como una dependencia a resolver. Causa raíz: `dependencies.py` tiene
    `from __future__ import annotations` (línea 3), que convierte TODAS
    las anotaciones de tipo del módulo en strings, resueltas después por
    `get_type_hints()` usando el namespace global del módulo. Pero
    `Annotated[User, Depends(auth_dependency)]` referencia `auth_dependency`
    como **variable de clausura** (el propio parámetro de la factory) —
    no está en los globals del módulo, así que esa resolución falla en
    silencio y FastAPI cae al fallback de query param. Los valores
    DEFAULT de un parámetro (`= Depends(auth_dependency)`) no se
    stringifican — se evalúan en el momento de definir la función, cuando
    `auth_dependency` todavía está en scope.

    **Fix intermedio (descartado por GGA, correctamente)**: el primer
    intento reescribió `current_user`/`role_repository` al estilo clásico
    `param: Tipo = Depends(...)` en vez de `param: Annotated[Tipo,
Depends(...)]`. Pyright (0 errores) y la suite completa lo validaron,
    pero GGA (pre-commit real, provider `codex`) lo bloqueó: `AGENTS.md`
    exige `Annotated[Tipo, Depends(...)]` en TODA dependencia FastAPI, sin
    excepción documentada para este caso — un workaround que resuelve el
    bug pero viola la convención del equipo, exactamente el caso que el
    mandate de "corregir TODO lo que GGA señale" (`project.md` § Mandated)
    existe para atrapar. El propio output de GGA lo resumió bien: "Either
    refactor the dependency pattern or add an explicit standards
    exception" — se eligió la primera opción, no bypassear el hook ni
    reescribir `AGENTS.md` por una decisión unilateral.

    **Fix real y definitivo**: `require_zone_action`/`get_effective_scope`
    (+ `get_role_repository`, su única dependencia compartida) se movieron
    a un módulo nuevo, `dependencies_zone_action.py`, que
    **deliberadamente NO tiene** `from __future__ import annotations`. Sin
    ese import, las anotaciones se evalúan de forma eager en el momento de
    definir la función (no como string) — `auth_dependency` sigue
    resuelto correctamente como variable de clausura real, y el estilo
    `Annotated[Tipo, Depends(...)]` que `AGENTS.md` exige funciona sin
    ninguna excepción. Cero imports circulares: el import es unidireccional
    (`dependencies.py` → `dependencies_zone_action.py`); el módulo nuevo
    importa `get_async_session` directo de
    `prosell.infrastructure.database.session` (no de `dependencies.py`), y
    `dependencies.py` re-exporta las 3 funciones vía `__all__` para que
    ningún import existente (`org_router.py`, `org_verticals_router.py`,
    los 3 archivos de test) tuviera que cambiar. Verificado: ruff +
    ruff-format + pyright real (0 errores en ambos archivos), suite
    completa backend (2573 passed), y request real contra staging con
    cookie real (200 en los dos endpoints migrados, antes 422/401). GGA
    (pre-commit real) confirmado `STATUS: PASSED` en el commit real
    (`21503852`, pusheado a `main`).

- [x] `admin_organizations_router.py` — 12/12 migrados (alcance, vía
      helper `_require_org_admin_view_all`, re-verificado al retomar:
      12 call sites reales, no 13 como decía la estimación — mismo
      patrón ya varias veces documentado de que el conteo original
      siempre hay que re-grepearlo). El helper cambió de firma
      (`current_user: User` → `effective_scope: AllScope |
ExplicitOrgsScope | OwnScope`, body a `isinstance(effective_scope,
AllScope)`), mismo alias nombrado `get_cookie_effective_scope` +
      `EffectiveScope` que ya usan `org_router.py`/`org_verticals_router.py`.
      10 de los 12 endpoints migrados perdieron su único uso real de
      `current_user` (solo servía para el chequeo viejo) — quitado de
      esas 10 firmas (ruff ARG001 lo atrapó solo, no manual); los otros 2
      (`create_organization`, `resend_organization_invitation`) lo
      mantienen porque lo siguen usando para `created_by_user_id`/
      `inviter_name` en el cuerpo. Lint/pyright real (0 errores)/suite
      completa (2573 passed)/26 tests
      de integración existentes (DB real, sin mocks, sin cambios de
      fixture necesarios — `async_client_as_admin` ya autentica un admin
      real contra el seed real de `20261006_0002`)/staging verificado con
      2 requests reales (`GET /admin/organizations`,
      `GET /admin/organizations/{id}/verticals`, ambos 200 con cookie
      real).
- [x] `product_router.py` — 38/38 migrados (re-verificado al retomar: 24
      alcance inline + 14 acción vía helper, no 27+14=41 como decía la
      estimación original — mismo patrón ya varias veces documentado de
      re-grepear en vez de confiar en un conteo viejo). Desglose real:
  - **14 de acción** (`_require_marketplace_publish(current_user)`,
    helper borrado): `batch_submit_products`, `batch_reserve_products`,
    `batch_pause_products`, `batch_resume_products`,
    `batch_mark_sold_products`, `batch_approve_products`,
    `batch_reject_products`, `approve_product`, `reject_product`,
    `publish_product`, `pause_product`, `resume_product`,
    `reserve_product`, `mark_product_sold`. Patrón: alias nombrado
    `MarketplacePublishUser = Annotated[User,
Depends(require_marketplace_publish_grant)]` reemplaza el tipo de
    `current_user` en la firma (no un parámetro nuevo — `require_zone_action`
    devuelve el mismo `User` real tras validar), cero cambios en el
    cuerpo salvo borrar la llamada al helper viejo.
  - **24 de alcance**, de las cuales:
    - **1 helper compartido** `_check_org_scope_permission` (usado por
      5 endpoints: `export_catalog_client_format`, `list_products`,
      `get_category_filter_values`, `get_product_price_range`,
      `get_featured_products`) — cambió de derivar `can_view_all_orgs`
      internamente de `current_user` a recibir `effective_scope` como
      parámetro nuevo; los 5 llamadores ahora pasan `effective_scope`
      (cada uno con su propio `effective_scope: EffectiveScope` agregado
      a la firma del endpoint).
    - **7 dentro de las mismas 14 funciones de marketplace** (mismo
      endpoint necesita AMBOS: gate de acción + alcance) —
      `approve_product`, `reject_product`, `publish_product`,
      `pause_product`, `resume_product`, `reserve_product`,
      `mark_product_sold`.
    - **16 standalone**, cada uno en su propio endpoint:
      `create_product`, `get_product`, `get_product_image_urls`,
      `batch_product_cover_urls`, `update_product`,
      `delete_product_image`, `submit_product_for_approval`,
      `get_available_transitions`, `get_product_audit_logs`,
      `delete_product`, `archive_product`, `bulk_upload_preview`,
      `bulk_upload_with_images`, `set_product_brokers`,
      `set_product_ownership`, `get_product_ownership`.
  - `_require_super_admin`/`_require_matching_version` en el mismo
    archivo son OTRO mecanismo (role-based / version-based) — **NO
    tocados, confirmado fuera de alcance**.
  - **9 archivos de test rotos y arreglados** (mismo patrón ya
    documentado en `admin_organizations_router.py`, pero con una
    variante nueva encontrada acá — ver abajo):
    - `tests/integration/api/routers/test_product_router_export_client_format.py`
      (4 tests, `assert 403 == 200`) — el fixture `_auth_user`/
      `_non_admin_user` fabricaba un `User`/`Role` SOLO en memoria (`id`
      aleatorio, nunca insertado en la DB real). El chequeo viejo leía
      `current_user.roles` directo (en memoria, sin DB) — funcionaba. El
      motor nuevo resuelve `effective_scope` vía una query REAL a
      `get_user_roles_with_grants(current_user.id)` — con un id que no
      existe en ninguna tabla, siempre da `OwnScope` sin importar qué rol
      reclame el objeto Python. Fix real: `_auth_user`/`_non_admin_user`
      ahora insertan un `UserModel`+`UserRoleModel` real contra el rol
      REAL ya sembrado (`20261006_0002`), no solo un objeto en memoria.
    - `tests/unit/api/routers/test_delete_product_image.py`,
      `test_update_product_thumbnail_cdn_purge.py`,
      `test_list_products_status_validation.py` (7 tests,
      `AttributeError: 'coroutine' object has no attribute 'all'`) —
      estos SÍ mockean `db` con `AsyncMock()` puro (sin spec de sesión
      real), y la query real de `get_role_repository` revienta contra el
      mock. Fix: override directo de `get_cookie_effective_scope`
      (alias nombrado de `product_router.py`) a un `OwnScope()` fijo —
      bypasea la DB por completo, consistente con que estos tests no
      prueban nada de alcance cross-org.
    - `tests/unit/api/routers/test_product_router_image_signing.py`
      (2 tests, mismo síntoma que el grupo anterior) — mismo fix.
    - `tests/unit/api/routers/test_get_product_image_urls.py` (1 test,
      `assert [] == [legacy_key]` — NO era un crash, el chequeo devolvía
      200 pero con la lista vacía) — `_make_org_admin_user()` fabrica un
      `User`/`Role` ADMIN solo en memoria con un `id` fijo nunca
      persistido; el motor nuevo lo resuelve a `OwnScope` (no admin), así
      que la relajación cross-tenant para claves legacy de bulk-upload
      nunca se activaba — dato filtrado, lista vacía en vez de error.
      Fix: override directo de `get_cookie_effective_scope` a
      `AllScope()` en los 2 tests de esa clase (la clase existe
      específicamente para probar esa relajación — con `OwnScope` nunca
      se ejercita el código real que dice probar).
    - `tests/integration/api/test_batch_review_api.py` (2 tests,
      `assert 200 == 403`, el inverso del primer grupo) —
      `_user_with_permission(test_user, has_marketplace_publish=False)`
      reusaba el `id` de `test_user`, que **siempre** tiene un rol
      SUPER_ADMIN REAL sembrado en la DB (fixture de
      `tests/integration/conftest.py`) — el chequeo viejo leía el rol
      "sales_agent" fabricado en memoria y lo respetaba; el motor nuevo
      ignora esa fabricación y encuentra el SUPER_ADMIN real, dando 200
      en vez de 403. Fix: usar el fixture real `seller_user` (ya
      existente en `tests/integration/api/conftest.py`, un usuario
      SEPARADO con un rol SALES_AGENT REALMENTE sembrado) en vez de
      `_user_with_permission`, para los 2 tests que de verdad necesitan
      que el caller NO sea admin.
  - **Lección general, reconfirmada 3 veces esta sesión en 3 formas
    distintas**: cualquier test que fabrique un `User`/`Role` SOLO EN
    MEMORIA (sin fila real en `users`/`user_roles`) para simular un rol
    específico deja de funcionar con el motor nuevo — `effective_scope`
    SIEMPRE resuelve vía una query real a la DB por `current_user.id`,
    nunca lee el atributo `.roles` del objeto Python. El fix es o bien
    (a) usar un fixture que persiste un usuario+rol real
    (`admin_user`/`seller_user`/patrón `_persist_user_with_role` nuevo
    en el archivo de export), o (b) si el test no mockea la DB con algo
    `spec=AsyncSession`-compatible real, overridear directamente el
    alias `get_cookie_effective_scope` del router con un `OwnScope()`/
    `AllScope()` fijo.
  - Verificado: ruff + pyright real (0 errores en los 8 archivos
    tocados), suite completa backend (2573 passed), y 4 requests reales
    contra staging con cookie real (`GET /products`, `GET
/products/price-range`, `GET /products/featured`, `GET
/products/export-client-format.zip` con y sin `all_organizations=true`
    — 404 de catálogo vacío en staging, NO 403, confirmando que
    `AllScope` se resuelve bien para el admin real).
- [x] **Confirmado fuera de alcance** (verificado, no son `Permission`-based):
      `_require_migration_admin` (`fb_credential_migration_router.py`,
      usa `has_role(RoleType.SUPER_ADMIN)`) y `_require_platform_admin`
      (`category_router.py`, mismo mecanismo). No se migraron.
- [x] Grep final de 0 resultados reales sobre TODO `src/` —
      `rg -n "has_permission\(Permission\.(ORG_ADMIN_VIEW_ALL|MARKETPLACE_PUBLISH)\)|require_permission\(Permission\.ORG_CREATE\)" src/`
      da solo 2 matches, ambos docstrings/comentarios históricos (uno en
      `dependencies.py` citando el patrón viejo como ejemplo de uso de
      `require_permission`, otro en `dependencies_zone_action.py`
      explicando qué reemplaza `get_effective_scope`) — cero código real
      restante. **Block 2 (motor de permisos) queda 100% completo.**
- [x] Migrar los 6 roles fijos actuales a perfiles-plantilla (2026-10-06) —
      migración de datos `20261006_0002`, siembra `role_grants`/`role_scope`
      para los 6 roles `RoleType` traduciendo `ROLE_PERMISSIONS` 1:1. Mismas
      guardas de seguridad que el precedente ya establecido
      (`20260812_0002_migrate_legacy_sedan_products.py`): salta silenciosamente
      si el rol todavía no existe, `ON CONFLICT DO NOTHING` en ambas tablas
      (nunca pisa un grant que un admin ya haya configurado a mano),
      `downgrade()` simétrico. Probado upgrade→downgrade→upgrade contra
      Postgres real y aplicado en staging real — conteos exactos verificados
      por SQL directo (super_admin=21, admin=13, manager=10, sales_agent=4,
      sales_user=2, viewer=2, scope `all` para super_admin/admin, `own` para
      el resto).
  - ⚠️ **Decisión de diseño real, documentada, no trivial**: la granularidad
    de zona usada acá NO es la de las 6 secciones de UI de §3.1(1)
    (Catálogo/Leads/Marketplace/Concesionarios/Configuración/Admin) — es
    `users`/`roles`/`organizations`/`catalog`/`marketplace`/`analytics`/
    `settings`, calcando 1:1 los 7 dominios de recurso del `Permission` enum
    viejo. Colapsar a las 6 zonas de UI hubiera perdido distinción real
    (ej. "crear usuario" y "crear rol" habrían quedado como el mismo
    `admin:create`) — agrupar varias zonas bajo una sección de UI es un
    problema de presentación (bloque 3), no de granularidad de autorización.
  - ⚠️ **`Permission.ORG_ADMIN_VIEW_ALL` no se tradujo a un grant** — se
    tradujo a `role_scope.scope_type = 'all'` para `super_admin`/`admin`
    (los únicos dos roles que lo tenían), `'own'` para el resto. Es
    semánticamente un alcance de visibilidad, no una acción sobre una zona.
  - 🔴 **HALLAZGO REAL, SIN RESOLVER — para que decida el usuario, no yo**:
    al re-verificar antes de migrar (regla 1), encontré que staging/prod
    tienen **7** roles de sistema, no 6. El 7mo es `role_type='vendedor'`
    ("Sales Agent"), seedeado por `scripts/init_data.py:81` — un subsistema
    REAL y activo (`vendedor_router.py`, `GetVendedoresUseCase`,
    `get_users_by_tenant_and_role(role="vendedor")`) que filtra por ese
    string literal, **separado del enum `RoleType.SALES_AGENT`**. Esto es un
    bug preexistente real, no relacionado con este trabajo: cualquier
    usuario con `role_type='vendedor'` tiene HOY cero permisos bajo
    `ROLE_PERMISSIONS` (esa clave no existe en el dict, `.get()` devuelve
    `set()` vacío). Un test ya existente
    (`test_doc_vendedor_has_4_permissions` en
    `tests/unit/test_role_based_permissions.py:1013`) usa "vendedor" como
    nombre en español para `RoleType.SALES_AGENT` — es terminología de test,
    NO evidencia de que el código real los trate como equivalentes en
    ningún lado. Esta migración **NO sembró grants para `vendedor` a
    propósito** — fusionarlo con `sales_agent`, dejarlo en cero, o borrar el
    subsystem de `vendedor_router.py` son decisiones de producto, no algo
    para que yo decida solo. Verificado en staging real: `vendedor` quedó en
    0 grants / scope NULL tras la migración, exactamente como se diseñó.
- [x] Borrar `RBACMiddleware` (2026-10-06) — re-verifiqué antes de borrar
      (regla 1, no confío en un diagnóstico de hace horas): `rg -ln
"RBACMiddleware"` solo devolvía el propio archivo y su test, cero
      routers. Borrado el archivo
      (`infrastructure/api/middleware/rbac_middleware.py`) + los 9 tests
      que lo ejercitaban directo en `test_role_based_permissions.py`
      (dos bloques contiguos, `# ── require_roles`/`# ── require_permissions`).
      Las propiedades de escalación que esos tests cubrían ya estaban
      cubiertas aparte vía `User.has_permission()`/`has_role()` (el
      mecanismo que de verdad está vivo, §1.2) — sin pérdida real de
      cobertura. Un test sí se reescribió (no se borró sin más):
      `test_invalid_role_string_does_not_grant_permissions` ahora verifica
      lo mismo (un string de rol inventado no otorga nada) contra
      `RoleType("super_hacker")` directo, en vez de contra el middleware
      muerto. Suite completa: 2560 passed (2569 − 9 tests removidos).
      Verificado en staging real: reinicio de contenedor sin el archivo,
      login real sigue funcionando.

_(desglose de tareas más fino se agrega cuando este bloque arranque — no
inventar detalle de implementación que todavía no se decidió)_

## Bloque 3 — UI de admin de perfiles

**Decisiones confirmadas con el usuario (2026-10-06), antes de desglosar
(regla 11 — no reinventar al implementar)**:

1. **Anti-escalación de ALCANCE** (zona×acción ya la tenía — ver
   `permission_escalation_guard.py` de Bloque 2; alcance quedó
   explícitamente sin resolver ahí): **subconjunto estricto**. El actor
   solo puede otorgar un alcance ⊆ el propio — `AllScope` otorga
   cualquiera; `ExplicitOrgsScope` solo otorga `OwnScope` o
   `ExplicitOrgsScope` con organizaciones ⊆ las propias; `OwnScope` no
   puede otorgar alcance a nadie (no puede crear/editar perfiles con
   alcance). Mismo principio que la guarda de zona×acción, extendido a
   alcance.
2. **Rol `vendedor`** (7mo rol de sistema real, separado de
   `RoleType.SALES_AGENT`, cero permisos por el bug ya documentado en
   Bloque 2/§1.6 del diagnóstico): **fusionar con `sales_agent` ahora**,
   como primer ítem de este bloque (bug fix chico e independiente,
   mismo criterio que el Bloque 1).

**Desglose (slices verticales, no backend-todo-luego-frontend-todo)**:

- [x] 3.0 — Fusionar `vendedor` → `sales_agent` (2026-10-07). Migración
      `20261007_0001` (`_do_upgrade`/`_do_downgrade`, patrón testeable ya
      establecido en `20260917_0001_migrate_legacy_vehicle_catalog.py`):
      reasigna cada `user_roles` de `vendedor` a `sales_agent` (dedupe si
      el usuario ya tenía ambos), crea `sales_agent` con sus grants/scope
      reales si faltara en el entorno (no garantizado — `init_data.py`
      solo siembra 4 de 6 roles), borra la fila `vendedor` vacía.
      `downgrade()` recrea el shell vacío, documentado como no-reversible
      para las asignaciones puntuales (quién tenía `vendedor` deja de ser
      reconstruible una vez fusionado).
  - **Re-verificado antes de implementar (regla 1)**: `rg` amplio sobre
    "vendedor" trae decenas de matches — casi todos son terminología de
    dominio (`vendedor_id` en leads/appointments), sin relación con el
    bug. El bug real es acotado a 3 archivos:
    `scripts/init_data.py` (seed), `get_vendedores.py` (filtro
    `role="vendedor"` literal), `vendedor_router.py` (el endpoint). Es
    una feature REAL y viva (`GET /api/v1/vendedores`, consumida por
    `LeadReassignModal.tsx` — dropdown de reasignación de leads), no
    código muerto — se arregló (filtro ahora usa
    `RoleType.SALES_AGENT.value`), no se borró.
  - **Gap real encontrado por el propio usuario, no por mí**: escribí la
    migración, la verifiqué a mano con `psql`, y la di por "lista" sin
    test automatizado. El usuario preguntó "¿esto fue con TDD?" — fui a
    buscar precedente, encontré que SÍ existe (`test_migrate_legacy_vehicle_catalog.py`,
    patrón `_do_upgrade`/`_do_downgrade` testeable), refactoricé la
    migración a ese patrón, y escribí
    `tests/integration/alembic/test_merge_vendedor_role_into_sales_agent.py`
    (6 tests: no-op sin `vendedor`, reasignación simple, dedupe de doble
    asignación, creación de `sales_agent` si falta, downgrade recrea
    shell, downgrade idempotente). **2 de los 6 fallaron en el primer
    run** — mi test asumía DB limpia, pero `prosell-test-pg` (contenedor
    persistente compartido) ya tenía un `sales_agent` real sembrado.
    Arreglado reusando el rol existente en vez de asumir su ausencia.
  - **Consecuencia de esa pregunta**: el usuario confirmó TDD estricto
    (rojo-verde-refactor visible) para el resto del Bloque 3, y después
    lo amplió a TODO el proyecto — ver `team.md` § Testing Posture
    (`Methodology: TDD estricto`, reemplaza `test-after` como default de
    equipo, 2026-10-07). El ítem 3.0 en sí se hizo test-after, antes de
    esa confirmación — no se reescribió retroactivamente.
  - Verificado: ruff + pyright reales (0 errores) sobre los 4 archivos
    tocados; suite completa backend **2579 passed** (2573 + 6 nuevos);
    migración probada upgrade→downgrade→upgrade contra Postgres real
    (`prosell-test-pg`) con datos de prueba simulando el merge y el caso
    de usuario duplicado, limpiados después. **Aplicada en staging real**
    (`prosell-staging-db`, con confirmación explícita del usuario — el
    harness bloqueó el intento inicial por "shared resource" y pidió esa
    confirmación): `vendedor` desapareció, quedaron los 6 roles reales
    (`admin`, `manager`, `sales_agent`, `sales_user`, `super_admin`,
    `viewer`), grants de `sales_agent` intactos (4, los esperados),
    `alembic_version` avanzó a `20261007_0001`. El fix de código
    (`get_vendedores.py`/`vendedor_router.py`) no está "vivo" en el
    contenedor de staging todavía — ese servicio corre de imagen built,
    sin mount de fuente; llega con el commit+push normal (deploy-on-merge),
    ya verificado localmente vía la suite completa.
  - Commit + push: **pendiente** — regla 10, solo cuando el usuario lo
    pida explícitamente.
- [x] 3.1 — Extender `permission_escalation_guard.py` con la regla de
      subconjunto de alcance (2026-10-07). **Primer ítem con TDD estricto
      en vivo** (rojo mostrado antes de implementar, confirmado con el
      usuario tras el ítem 3.0): 15 tests escritos primero (10 de
      `Scope.covers()` en `test_permission_scope.py`, 5 del guard nuevo en
      `test_scope_escalation_guard.py`), corridos y confirmados en rojo
      (`AttributeError: no attribute 'covers'` / `ImportError`), recién
      ahí implementado lo mínimo para pasar.
  - **Diseño**: `covers(other: Scope) -> bool` nuevo en el protocolo
    `Scope` + las 3 clases concretas (mismo patrón Specification que
    `permits()`, sin `if/elif` central) — `AllScope.covers()` siempre
    `True`; `ExplicitOrgsScope.covers()` cubre `OwnScope` y
    `ExplicitOrgsScope` cuyo set de orgs sea subconjunto del propio, nunca
    `AllScope`; `OwnScope.covers()` siempre `False` (confirmado
    explícitamente: no puede otorgar alcance a nadie, ni siquiera otro
    `OwnScope`). `ensure_no_scope_escalation(granter_scope, requested_scope)`
    nuevo en `permission_escalation_guard.py`, mismo archivo que la guarda
    de zona×acción — llama a `granter_scope.covers(requested_scope)`, lanza
    `ScopeEscalationException` nuevo (`role_exceptions.py`) si no cubre.
  - Sin tocar routers todavía — puro dominio, sin DB, sin staging
    aplicable (consistente con el propio alcance que el ítem ya preveía).
  - Verificado: ruff + ruff-format + pyright reales (0 errores) sobre los
    5 archivos tocados; suite completa backend **2594 passed** (2579 + 15
    nuevos).
- [x] 3.2a — **Prerequisito real encontrado al empezar 3.2, no scope
      creep** (2026-10-07): `Role.role_type` seguía siendo no-opcional en
      el dominio, y `create_custom_role()` todavía hardcodeaba
      `role_type=RoleType.VIEWER` — exactamente el bug de §1.3(2) que la
      migración `20261006_0001` relajó a nivel DB pero que el dominio
      nunca terminó de adoptar. Como `viewer` ya es el `role_type` real
      del rol de sistema Viewer, crear el PRIMER perfil personalizado
      nuevo ya chocaba contra `ix_roles_role_type_unique_when_present`.
      `rg` confirmó cero llamadores reales en `src/` — sin ripple de
      producción. Fix bajo TDD estricto: 5 tests existentes afirmaban el
      bug como comportamiento esperado (`test_role_entity.py` x3,
      `test_role_repository.py` x1, `test_pydantic_validation.py` x1,
      `test_role_based_permissions.py` x1 — 6 en total) — corregidos
      primero para describir el comportamiento correcto (rojo real contra
      el código viejo), recién ahí: `Role.role_type: RoleType | None`,
      `create_custom_role()` usa `role_type=None`, `get_permissions()`
      devuelve `set()` para `role_type=None` (nunca hereda VIEWER),
      `role_repository_impl.py` arreglado en ambos sentidos (escritura +
      lectura). Ripple real encontrado de paso en `get_vendedores.py`
      (tocado en 3.0): el fallback de `role.value` ya no es seguro con
      `role_type` opcional. Verificado: ruff+pyright reales (0 errores),
      suite completa **2594 passed**.
- [ ] 3.2 — Backend CRUD de perfiles: `GET/POST/PATCH/DELETE` sobre
      `roles`+`role_grants`, gateado por zona `roles` (create/read/
      update/delete, ya sembrada) + la guarda de zona×acción existente.
- [ ] 3.3 — Backend: clonar plantilla + editar alcance (`role_scope`/
      `role_organization_access`), usando la guarda de 3.1.
- [ ] 3.4 — Backend: asignar/desasignar usuarios a un perfil
      (`user_roles`), misma guarda aplicada (nadie asigna lo que no
      tiene).
- [ ] 3.5 — Frontend: listado + crear/clonar perfil, matriz de grants
      agrupada por sección de UI — mapeo propuesto (confirmar al llegar):
      Catálogo←`catalog`, Marketplace←`marketplace`,
      Concesionarios←`organizations`, Configuración←`settings`,
      Admin←`users`+`roles`+`analytics`. "Leads" no aparece todavía
      (depende del Bloque 4).
- [ ] 3.6 — Frontend: editor de alcance (organizaciones) + asignación de
      usuarios a perfiles.

_(cada ítem con test de regresión real + verificación en staging antes de
marcar ✅, mismas reglas de ejecución de arriba)_

## Bloque 4 — Zona Leads/CRM + catálogo público/landing (§7 del diagnóstico)

- [ ] _(sin desglosar todavía)_

## Bloque 5 — UI de gestión de assignments FB

- [ ] _(sin desglosar todavía — menor prioridad, §8)_
