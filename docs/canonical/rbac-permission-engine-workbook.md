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

| Bloque | Descripción                                                                           | Estado                                                                              |
| ------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1      | Fix leak público (`tenant_id`/`organization_id`)                                      | ✅ Done (deploy a staging via CI, prod sin promover a propósito)                    |
| 2      | Motor central Zona × Acción × Alcance                                                 | 🟡 Casi completo — falta migrar routers reales a `require_zone_action` (deliberado) |
| 3      | UI de admin para perfiles                                                             | 🔴 Not started                                                                      |
| 4      | Zona Leads/CRM + catálogo público/landing                                             | 🔴 Not started                                                                      |
| 5      | UI de gestión `product_fb_account_assignments` / `OrganizationMarketplaceAccessModel` | 🔴 Not started                                                                      |

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
  - [ ] **Pendiente, siguiente paso real**: migrar los 32 call sites de
        verdad — 2 de acción (→ `require_zone_action`) y 30 de alcance
        (→ `get_effective_scope` + `isinstance(scope, AllScope)`), la
        mayoría concentrados en `product_router.py`. Todavía no tocado.
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

- [ ] _(sin desglosar todavía — depende de cómo cierre el Bloque 2)_

## Bloque 4 — Zona Leads/CRM + catálogo público/landing (§7 del diagnóstico)

- [ ] _(sin desglosar todavía)_

## Bloque 5 — UI de gestión de assignments FB

- [ ] _(sin desglosar todavía — menor prioridad, §8)_
