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

| Bloque | Descripción                                                                           | Estado                                                           |
| ------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1      | Fix leak público (`tenant_id`/`organization_id`)                                      | ✅ Done (deploy a staging via CI, prod sin promover a propósito) |
| 2      | Motor central Zona × Acción × Alcance                                                 | 🟡 In Progress (migraciones listas, sin commitear)               |
| 3      | UI de admin para perfiles                                                             | 🔴 Not started                                                   |
| 4      | Zona Leads/CRM + catálogo público/landing                                             | 🔴 Not started                                                   |
| 5      | UI de gestión `product_fb_account_assignments` / `OrganizationMarketplaceAccessModel` | 🔴 Not started                                                   |

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
  - [ ] **Sin commitear todavía** — pendiente de confirmación del usuario (regla 10).
  - ⚠️ Hallazgo aparte para el próximo ítem: staging tiene 7 roles de
    sistema, no 6 (`vendedor` además de `sales_agent`) — investigar antes
    de asumir "6 roles fijos" literal en el siguiente paso.
- [ ] Domain: entidad `PermissionProfile` + specification objects de alcance (`OwnScope`/`AllScope`/`ExplicitOrgsScope`)
- [ ] Servicio de anti-escalación (nadie otorga lo que no tiene)
- [ ] Dependency único `require_zone_action(zone, action)` — reemplaza `RBACMiddleware` + los `current_user.has_permission(...)` inline
- [ ] Migrar los 6 roles fijos actuales a perfiles-plantilla (Liskov — sin camino de código especial)
- [ ] Borrar `RBACMiddleware` (confirmado muerto, §3.1(5))
- [ ] Tests (unit + integración del dependency nuevo)

_(desglose de tareas más fino se agrega cuando este bloque arranque — no
inventar detalle de implementación que todavía no se decidió)_

## Bloque 3 — UI de admin de perfiles

- [ ] _(sin desglosar todavía — depende de cómo cierre el Bloque 2)_

## Bloque 4 — Zona Leads/CRM + catálogo público/landing (§7 del diagnóstico)

- [ ] _(sin desglosar todavía)_

## Bloque 5 — UI de gestión de assignments FB

- [ ] _(sin desglosar todavía — menor prioridad, §8)_
