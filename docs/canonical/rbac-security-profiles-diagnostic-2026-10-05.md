# Diagnóstico: RBAC, Visibilidad de Datos y Perfiles de Seguridad

> **Fecha**: 2026-10-05 · **Actualizado**: 2026-10-05 (misma sesión, continuación) ·
> **Tipo**: Diagnóstico técnico + diseño propuesto (§5-§9), no una decisión cerrada.
> Cada afirmación de este documento está verificada contra el código real (commit
> `a3eb9541` + `962b0914`), no contra lo que el nombre de una clase o un test sugiere.
> Donde no verifiqué algo a fondo, lo digo explícitamente en vez de asumir.
>
> **Propósito**: servir de insumo para decidir cómo diseñar e implementar un sistema
> de roles/permisos dinámico y administrable — empezando por `super_admin` y bajando
> hacia perfiles personalizados con visibilidad de datos y acceso a zonas de la
> plataforma — sin repetir trabajo si más adelante esto pasa por un flujo formal
> (AIDLC u otro).
>
> **Estado**: las 8 preguntas de §3 ya fueron respondidas (§3.1). A partir de esas
> respuestas se armó un diseño propuesto (§6), se validó en código real el repo
> paralelo `fb-autopost` (§5 — corrige una afirmación mía errónea), se definió el
> catálogo público como landing con buscador tipo marketplace (§7), y se encontró un
> bug de seguridad real e independiente (§4) que conviene arreglar ya. Nada de esto
> está implementado todavía — es diseño + hallazgos, pendiente de ejecución.

---

## 1. Estado real verificado

### 1.1 El modelo de permisos existe y está bien pensado — para 6 roles fijos

`apps/api/src/prosell/domain/entities/role.py`:

- `RoleType` (StrEnum, 6 valores): `super_admin`, `admin`, `manager`, `sales_agent`,
  `sales_user`, `viewer`.
- `Permission` (StrEnum, 18 valores) en 6 dominios: `user:*`, `role:*`, `org:*`,
  `vehicle:*`, `org:admin_view_all` + `marketplace:publish`, `analytics:*`,
  `settings:*`.
- `ROLE_PERMISSIONS: dict[RoleType, set[Permission]]` — matriz estática en código
  Python, un diccionario literal, **no persistida en base de datos**.
- `Role.get_permissions()` / `Role.has_permission()` / `User.has_permission()` —
  los tres leen `ROLE_PERMISSIONS.get(role.role_type, set())`. Ninguno mira el `id`
  del rol, su `tenant_id`, ni ningún dato propio de la fila — **solo el `role_type`**.

Bien testeado: `tests/unit/test_role_based_permissions.py` verifica conteos por rol
(admin=14, manager=10, vendedor=4, viewer=2) y que la jerarquía sea estrictamente
decreciente. Esos tests pasan porque describen el comportamiento actual — correcto
para el modelo de 6 roles fijos, no dicen nada sobre perfiles custom porque esos no
existen en la práctica (ver 1.3).

### 1.2 Dos mecanismos de enforcement que no se hablan entre sí

| Mecanismo                                                   | Dónde vive                                         | Patrón                                                                                                                           | Uso real                                                            |
| ----------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `require_permission(Permission.X)`                          | `infrastructure/api/dependencies.py:448`           | `Depends()` de FastAPI, recibe un `User` de dominio real + `AbstractRoleRepository`                                              | **1 endpoint de todo el sistema** (`org_router.py`, `ORG_CREATE`)   |
| `RBACMiddleware.require_roles()` / `.require_permissions()` | `infrastructure/api/middleware/rbac_middleware.py` | Decorador, espera un **`dict` plano** en `kwargs["current_user"]` — incompatible con el `User` real que usa el resto del sistema | **Cero routers.** Código muerto confirmado por búsqueda exhaustiva. |

Lo que realmente autoriza casi toda la API es un **tercer patrón, no formalizado**:
cada router llama `current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)` inline,
cada vez que lo necesita. En `product_router.py` conté más de 5 repeticiones de esa
misma línea exacta (líneas 487, 1276, 1327, 1455, y más). Funciona — pero no hay una
sola fuente de verdad por request, y nada obliga a un endpoint nuevo a acordarse de
chequearlo.

### 1.3 Los perfiles personalizados no están "apagados" — son imposibles hoy

Tres barreras independientes, cualquiera de las tres ya los bloquea:

1. **Esquema**: la tabla `roles` (`infrastructure/models/role_model.py`) no tiene
   ninguna columna de permisos. Los permisos viven únicamente en el diccionario
   Python `ROLE_PERMISSIONS`, nunca en una fila de la base.
2. **Constraint**: `role_type` tiene `unique=True` en la tabla `roles`. Como
   `Role.create_custom_role()` siempre fija `role_type=RoleType.VIEWER`, el **segundo**
   intento de crear un rol personalizado viola la constraint UNIQUE y falla a nivel
   de base de datos — no es un límite de producto, es un error de SQL.
3. **Lectura**: aunque pasaran las dos barreras anteriores, `has_permission()` sigue
   leyendo `ROLE_PERMISSIONS` por `role_type`, así que una fila personalizada nunca
   podría tener un set de permisos propio de todos modos.

No hay UI de administración de roles en el frontend (`apps/web/src`) — búsqueda
exhaustiva, cero resultados.

### 1.4 Bug confirmado y arreglado (2026-10-05): el sidebar no mostraba lo mismo según el rol, sino según en qué carpeta vive la página

Este era el bug que reportaste ("ni el mismo super_admin tiene visibilidad") — reproducido,
explicado, y ya corregido en este mismo commit. Queda documentado abajo tal como estaba
roto, para que conste el diagnóstico.

`Sidebar` (`components/layout/Sidebar.tsx`) recibe un prop `groups: NavGroup[]` que
decide qué secciones mostrar (Layer 1). Ese prop **no lo calcula el rol del usuario** —
lo pasa, hardcodeado, cada uno de 5 `layout.tsx` distintos, uno por carpeta de rutas de
Next.js:

| Layout                | `groups` que pasa                                                     |
| --------------------- | --------------------------------------------------------------------- |
| `(admin)/layout.tsx`  | `general, inventario, ventas, concesionarios, configuración` (las 5)  |
| `(seller)/layout.tsx` | `general, inventario, ventas, concesionarios` (**sin** configuración) |
| `manager/layout.tsx`  | `inventario, ventas` (**sin** general — sin Dashboard)                |
| `vendedor/layout.tsx` | `general, ventas` (**sin** inventario — sin Catálogo)                 |
| `branch/layout.tsx`   | `inventario, configuración` (**sin** general ni ventas)               |

`/dashboard` vive físicamente en `src/app/(admin)/dashboard/page.tsx` → usa el layout
de 5 grupos completo. `/catalog` vive físicamente en `src/app/(seller)/catalog/page.tsx`
→ usa el layout de 4 grupos, sin "Configuración". **No hay rutas duplicadas ni
middleware de redirección por rol** (verificado, no existe `middleware.ts`) — así que
esto le pasa a CUALQUIER usuario, no solo a `super_admin`: al navegar de `/dashboard` a
`/catalog`, Next.js cambia de árbol de layout porque son carpetas de ruta distintas, y
la sección "Configuración" desaparece del sidebar — no porque el usuario perdió el
permiso, sino porque la página de destino vive en una carpeta cuyo layout nunca pidió
mostrarla. Volver a `/dashboard` la devuelve porque vuelve a montar el layout de 5
grupos.

La causa raíz real: **la visibilidad del sidebar está acoplada a la ubicación física
del archivo de la página, no al rol/permiso del usuario.** El chequeo de permisos
(`hasPermission`, Layer 2, dentro de `Sidebar`) solo puede RESTRINGIR lo que el layout
ya decidió mostrar — nunca puede devolver algo que el layout no pidió. Con 5 listas
hardcodeadas mantenidas a mano en 5 archivos distintos, la divergencia (como la que
reportaste) no es un accidente — es el resultado esperado de ese diseño apenas alguien
agrega una página a una carpeta sin actualizar las otras 4.

**Fix aplicado (2026-10-05)**: se eliminó el prop `groups` de `Sidebar` por completo —
ya no lo recibe de ningún `layout.tsx`. La visibilidad de cada grupo se calcula ahora
adentro del propio componente, a partir de `hasPermission`, con el mismo resultado sin
importar qué página (ni qué carpeta) la montó. "Concesionarios" sigue gateado por
`ORG_ADMIN_VIEW_ALL` y "Configuración" por `SETTINGS_READ`, exactamente como ya estaba
(Layer 2 no cambió). "General"/"Inventario"/"Ventas" quedan visibles para cualquier
usuario autenticado — no se les agregó un permiso nuevo que nadie pidió; de hecho, un
segundo archivo de test preexistente (`tests/unit/components/layout/Sidebar.test.tsx`)
ya documentaba esa intención explícitamente ("no permission required"), señal de que
alguien ya había empezado este mismo fix antes y no lo había terminado de aplicar a los
5 `layout.tsx` ni al componente. Tests de regresión agregados en ambos archivos de test
de `Sidebar` probando que el resultado es idéntico para los mismos permisos sin importar
el pathname.

### 1.5 Visibilidad multi-tenant (datos): consistente en lógica, duplicada en forma

El patrón `None if is_org_admin else current_user.tenant_id` como argumento de filtro
de repositorio es el mismo en todos los lugares que lo usan, y es correcto — pero
`is_org_admin` se recalcula inline en cada call site (`current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)`)
en vez de resolverse una vez por request. Mismo problema de forma que 1.2, aplicado a
visibilidad de datos en lugar de acciones — distinto del bug de 1.4, que es visibilidad
de navegación/UI, no de datos.

### 1.6 Inconsistencias concretas encontradas en la matriz actual

- **`sales_agent` no tiene `marketplace:publish`** — pero es el rol atado 1:1 al
  modelo de `FacebookAccount` por vendedor (OAuth + token propio por `seller_user_id`).
  O la matriz está desactualizada, o hay una ruta que bypassea el permiso para
  publicar en FB. No decidí cuál — lo marco como pregunta abierta (§3).
- **`sales_user` y `viewer` tienen el set de permisos idéntico** (`vehicle:read` +
  `analytics:view`) — dos roles indistinguibles en la práctica, nombres fácilmente
  confundibles.
- **Cero permisos para Leads/CRM/Appointments.** Los 18 permisos cubren
  user/role/org/vehicle/analytics/settings — nada para el dominio de leads, que es
  un módulo entero del producto. Hoy el acceso a leads no está gateado por
  `Permission` en absoluto.

**Hallazgo nuevo (2026-10-06, al implementar — no estaba en el scan original
de este documento)**: hay un **7mo rol de sistema real**, `role_type='vendedor'`
("Sales Agent"), seedeado por `scripts/init_data.py:81`, **separado del enum
`RoleType.SALES_AGENT`**. No es un leftover muerto — `vendedor_router.py` y
`GetVendedoresUseCase` filtran usuarios por ese string literal
(`get_users_by_tenant_and_role(role="vendedor")`), un subsistema real y activo.
Consecuencia: cualquier usuario con ese `role_type` tiene HOY cero permisos
bajo `ROLE_PERMISSIONS` (esa clave no existe en el dict). Verificado que
`test_doc_vendedor_has_4_permissions` (nombre en español del test, no del
código real) testea `RoleType.SALES_AGENT`, no `"vendedor"` — mismo patrón de
nomenclatura mixto español/inglés, sin relación mecánica entre ambos en
ningún lado del código. Sin resolver a propósito — ver workbook, bloque 2,
para los detalles y las opciones (fusionar, dejar en cero, o deprecar el
subsistema de `vendedor_router.py`).

---

## 2. Visión objetivo (como la planteaste)

- UI/UX dinámica de administración de roles y permisos.
- Jerarquía empezando desde `super_admin` (máxima autoridad) hacia abajo.
- Perfiles personalizados que otorguen **visibilidad de datos** y **acceso a zonas**
  de la plataforma de forma granular — no solo los 6 roles fijos de hoy.
- Objetivo explícito de "arreglar, organizar todo, recuperar ese código muerto" —
  es decir, esto no es solo sumar una feature, es sanear lo que ya existe.

---

## 3. La brecha real (y las preguntas que solo vos podés responder)

Llegar de 1 a 2 no es una extensión incremental — es un cambio de arquitectura: pasar
de **permisos como código** (un `dict` Python, deploy-time) a **permisos como dato**
(una tabla, runtime, editable desde una UI). Eso implica, como mínimo:

1. **¿Qué es una "zona"?** ¿Los dominios que ya existen en `Permission`
   (vehicle/org/analytics/settings) más uno nuevo para leads/CRM, o una agrupación
   distinta pensada por página/sección de la UI (Catálogo, Leads, Marketplace,
   Configuración, Admin)? Esto determina el vocabulario de todo el sistema nuevo.
2. **¿Granularidad?** ¿Toggle on/off por zona (ver o no ver), o CRUD completo por
   zona (crear/leer/actualizar/borrar, como ya existe para `vehicle:*`)?
3. **¿Alcance de un perfil personalizado?** ¿Por organización (cada dealer arma sus
   propios perfiles) o perfiles globales reusables que `super_admin` define y asigna?
   La columna `tenant_id` en `roles` ya anticipa el caso por-organización — solo falta
   la capa de permisos para que sirva de algo.
4. **¿Quién puede crear perfiles?** ¿Solo `super_admin`, o también `admin`/`manager`
   dentro de su propia organización (self-service)?
5. **¿Qué hacemos con `RBACMiddleware`?** Está muerto. ¿Se borra (y todo migra al
   patrón `require_permission` + un dependency compartido para visibilidad), o el
   patrón de decorador es el que en realidad querés hacia adelante y migramos
   `require_permission` a eso? Pedís "recuperar código muerto" — necesito saber si
   eso significa "revivir y usar" o "sanear/eliminar".
6. **El gap de `sales_agent` + `marketplace:publish`** — ¿bug a corregir, o
   intencional (un manager dispara la publicación aunque el token de FB sea del
   vendedor)?
7. **`sales_user` vs `viewer`** — ¿se fusionan en uno, o estaban pensados para
   diverger y quedaron a medio terminar?
8. **Permisos de Leads/CRM** — ¿se agregan como nuevo dominio de `Permission`
   (`lead:create/read/update/delete`, `appointment:*`), o leads se gatea distinto
   (por pertenencia al tenant, sin granularidad de rol)?

No respondo ninguna de estas ocho en este documento a propósito — son decisiones de
producto/seguridad, no técnicas.

**Nota aparte sobre el bug de §1.4 (sidebar)**: a diferencia de las 8 preguntas de
arriba, no dependía de ninguna decisión de perfiles/zonas nuevas — la corrección
("las secciones visibles del sidebar se derivan del rol, no de en qué carpeta vive la
página destino") es correcta sin importar cómo se resuelvan las otras 8. Ya se arregló
(2026-10-05, mismo commit que este diagnóstico), independiente del resto — no hubo que
esperar al diseño completo para esto.

---

## 3.1 Respuestas del equipo (2026-10-05)

1. **¿Qué es una "zona"?** Agrupación por **sección de UI** (Catálogo, Leads,
   Marketplace, Concesionarios, Configuración, Admin), no los dominios actuales de
   `Permission` 1:1 — cada zona mapea hacia uno o más dominios de permiso por debajo.
2. **¿Granularidad?** CRUD completo por zona. Caso de uso confirmado explícitamente:
   un perfil "agente vendedor Prosell" que solo puede **leer** el catálogo (no
   modificarlo), con **visibilidad por organización** — `super_admin` o un manager
   con privilegios menores puede verle todas las organizaciones o solo las que se le
   habiliten. Esto confirma que "alcance" (de quién son los datos) es un eje
   **separado** de "acción" (qué puede hacer) — ver el modelo de 3 ejes en §6.
3. **¿Alcance de un perfil personalizado?** Hybrid confirmado: `super_admin` define
   plantillas globales, cada organización puede **clonarlas**, pero la visibilidad
   por organización de cada clon se fija de cero por organización — **no se hereda
   del template**. La matriz de permisos (qué puede hacer) sí se clona; el alcance
   (qué organizaciones ve) nunca.
4. **¿Quién puede crear perfiles?** Confirmado: `admin` dentro de su propia
   organización, pero el `manager` **solo tiene los permisos que el propio `admin`
   le configure** — es decir, en el modelo nuevo hasta los roles "fijos" de hoy
   (incluido `manager`) pasan a ser perfiles configurables, no un camino de código
   especial. Ver regla de anti-escalación en §6.
5. **¿Qué hacemos con `RBACMiddleware`?** Confirmado: se borra. No hay nada
   reutilizable (ver §1.2 — espera un `dict` plano incompatible con el `User` real
   que usa el resto del sistema). Migra todo al dependency único que describe §6.
6. **El gap de `sales_agent` + `marketplace:publish`** — Confirmado como diseño
   intencional, no bug: el vendedor publica solo, sin aprobación previa; la
   "aprobación" del manager ocurre al otorgarle acceso a organizaciones/lotes de
   productos (no al momento de publicar). Pregunta de seguimiento del equipo —
   respondida en §5: si el manager o la plataforma pueden usar la cuenta del
   vendedor para despublicar vendidos o programar publicaciones automáticas.
7. **`sales_user` vs `viewer`** — Pendiente de resolver en la práctica: el equipo
   pidió aclarar primero qué son estos roles hoy y cómo funciona el catálogo público
   (cubierto en §7) antes de decidir fusión. No cambia la recomendación original de
   fusionarlos (siguen siendo roles internos de staff, idénticos en permisos) — ver
   §7 para la aclaración completa sobre visitantes públicos vs. staff interno.
8. **Permisos de Leads/CRM** — Confirmado: nuevo dominio de permiso. El vendedor ve
   sus propios leads; manager y `super_admin` ven **todos los leads de todos los
   vendedores, agrupados por vendedor, con su progreso y estado**. Mapea 1:1 al
   mismo eje de alcance de la pregunta 2 (`own` para vendedor, `all` para
   manager/super_admin) — valida que el modelo de 3 ejes cubre ambos casos sin
   lógica especial. El equipo también señaló que hay que tener en cuenta el
   publicador automático `fb-autopost` (hoy pausado) al diseñar esto — cubierto en
   §5.

---

## 4. Bug real encontrado — independiente de las 8 preguntas, arreglar ya

Mismo criterio que el bug del sidebar (§1.4): esto no depende de ninguna decisión de
diseño de arriba, es un defecto de código a corregir sin esperar al resto.

**El endpoint público de producto filtra `tenant_id` y `organization_id` a
cualquier visitante anónimo.**

Verificado en código:

- `apps/api/src/prosell/infrastructure/api/routers/public_product_router.py:116-151`
  (`get_public_product`, `GET /{slug}`, sin autenticación) construye la respuesta con
  `tenant_id=model.tenant_id, organization_id=model.organization_id` explícitamente.
- `apps/api/src/prosell/application/dto/product/response.py:149`
  (`PublicProductResponse`) hereda de `ProductResponse`, que declara
  `tenant_id: UUID` y `organization_id: UUID` como campos planos (línea ~29-30) — la
  clase pública nunca los excluye.
- `PublicProductResponse` sí excluye deliberadamente el teléfono de la organización
  (por diseño, documentado en su propio docstring) — el patrón de "no todo campo
  interno llega al DTO público" ya existe en el código, simplemente no se aplicó a
  estos dos UUIDs.

Es el tercer leak cross-tenant real encontrado esta semana (los otros dos ya se
arreglaron — ver `project.md` § Deviations, intent `260911-cross-org-export-ux`).
Fix: excluir ambos campos del DTO público (o de su serialización), sin esperar al
rediseño del catálogo público de §7 — el mismo DTO sanitizado es la base de ese
catálogo nuevo, así que conviene resolverlo primero.

**Corrección de alcance al implementar (2026-10-06)**: al re-verificar el código
antes de tocarlo (regla 1 del workbook), `ProductResponse` tenía además `org_code`/
`org_color`/`fb_account_ids` heredados por `PublicProductResponse` — no filtraban
un valor real hoy (el router nunca los poblaba para el path público, siempre
`null`/`[]`), pero quedaban ahí por descuido de herencia, no por diseño, y
`org_code` en particular es exactamente "algo que relaciona el producto con su
organización" (§7). Se excluyeron los 5 campos juntos, no solo los 2 originales —
mismo defecto, alcance más completo. Fix real: `PublicProductResponse` dejó de
heredar de `ProductResponse` — ambas extienden ahora una base compartida
(`_ProductPublicSafeResponse`) con solo los campos públicos, así que un campo
sensible nuevo que se agregue a `ProductResponse` a futuro no puede filtrarse por
accidente de herencia. Verificado end-to-end: suite completa backend (1852
passed), integración real del router (10/10), y `curl` directo contra
`prosell-staging-api` confirmando 0 campos sensibles en el JSON real.

---

## 5. Validación del repo `fb-autopost` (corrige una afirmación errónea)

En una vuelta anterior de esta conversación afirmé "fb-autopost hoy tiene cero
código" — **eso era falso**, y quedó corregido en el chat pero merece quedar
documentado con la corrección explícita: esa afirmación se basó en buscar la palabra
"autopost" _dentro_ de `prosell-sass`, nunca miré el repo hermano ni el router del
backend que ya le habla. El equipo pidió explícitamente "validalo primero" antes de
proponer nada — correcto, cambió la propuesta entera.

### 5.1 Lo que existe, verificado

**Repo paralelo**: `/home/rpadron/proy/fb-autopost` — app de escritorio con **Flet**
(no un repo vacío ni un concepto a futuro). Cliente HTTP propio
(`src/fb_autopost/api/prosell_client.py`) que ya pega contra la API real de ProSell
vía un bot-token compartido (`FB_PROSELL_BOT_TOKEN` / header `X-Bot-Token`).

**Backend** (`apps/api/src/prosell/infrastructure/api/routers/fb_sync_router.py`),
auth vía `verify_bot_token` (`dependencies.py:280-305`, comparación constant-time
contra un secreto único global, documentado como "no scopea por tenant — cada
endpoint debe verificar tenant por sí mismo"):

| Necesidad del equipo                         | Ya existe como                                                                                                                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Traer productos marcados a publicar"        | `GET /api/v1/fb-sync/pending` (`get_pending_products`, línea 423)                                                                                                                                                       |
| "Control de quién puede publicar qué"        | tabla `product_fb_account_assignments` + `OrganizationMarketplaceAccessModel` (línea 240-267) — grant cross-tenant explícito (`inventory_owner_organization_id`, `operator_organization_id`, `can_publish_marketplace`) |
| "Historia de publicaciones de cada producto" | `fb_publication_history` — log inmutable de eventos (`published`/`failed`/`deleted`), una fila por intento (`fb_sync_router.py:628-786`, handler `sync_callback`)                                                       |
| "Estado/control consolidado"                 | `fb_publication_status` — fila consolidada por producto+cuenta con contadores (`publication_count`, `failure_count`, `first_published_at`, `last_published_at`)                                                         |
| Despublicar (manual o por venta)             | cola `FBUnpublishRequestModel` con reintentos (`attempt_count`, máx. `MAX_UNPUBLISH_ATTEMPTS`) vía `GET /unpublish-pending` + `POST /unpublish-callback`                                                                |
| Compat hacia atrás                           | tabla legacy `marketplace_publications` (mantenida a propósito, documentada como "legacy, kept for backwards compat")                                                                                                   |

El dominio `Publication` (`apps/api/src/prosell/domain/entities/publication.py`) ya
modela la máquina de estados completa (`pending → publishing → published →
failed/expired/sold`), con categorización de error (A=transiente/reintentable,
B=bloqueante/requiere confirmación humana) y el comentario explícito "un producto
puede tener múltiples publicaciones (ej. tras expirar/republicar)".

### 5.2 Qué significa esto para el diseño de permisos (§6)

**No hay que diseñar nada nuevo para automatización.** Lo que yo proponía como
`automation_grants` (tabla nueva, permiso separado para que el sistema actúe sin un
humano haciendo clic) ya existe, con otro nombre, más maduro de lo que supuse
(`product_fb_account_assignments` + `OrganizationMarketplaceAccessModel`).

Lo que sí corresponde:

- **Mantener separadas** las dos capas de autorización — el bot-token (máquina a
  máquina, ya auditado por fila) y el motor de permisos humano de §6 (qué puede
  hacer un usuario logueado en la web). El motor de permisos humano debe gatear la
  **gestión** de esas tablas (crear/editar un assignment, aprobar un
  `OrganizationMarketplaceAccessModel`) — zona `marketplace`, acción
  `manage_access` — no reemplazar el mecanismo de automatización en sí.
- **Pregunta del equipo, respondida**: sí, el manager puede usar la cuenta del
  vendedor para despublicar vendidos manualmente — es la misma matriz
  zona=`marketplace`/acción=`unpublish`, con el mismo alcance que ya tiene. La
  publicación/despublicación **automática y programada** (fb-autopost ejecutando sin
  que nadie haga clic) ya tiene su propio camino de datos (`fb_sync_router` +
  `FBUnpublishRequestModel`) — no requiere humano en el request, por diseño.
- **Riesgo anotado, no urgente**: `verify_bot_token` usa un único secreto global
  para todo el bot, no uno por cuenta/instalación. Hoy no es explotable porque cada
  endpoint valida tenant/assignment por fila de todos modos — pero si el `.exe` de
  `fb-autopost` se distribuye a varios vendedores con el mismo secreto embebido, el
  radio de daño de una fuga del secreto sube. No bloquea nada, queda para cuando se
  retome ese proyecto (hoy pausado, confirmado sin código de automation-scheduling
  todavía — `fd -i "autopost"` sobre `apps/api` y `apps/web` no devuelve nada más
  que lo ya listado arriba).

---

## 6. Diseño propuesto: motor de permisos Zona × Acción × Alcance

Respuesta al pedido explícito del equipo: "diseña la mejor forma de manejar los
perfiles dinámicamente, SOLID, DRY, patrones de diseño, reutilizable y escalable,
hasta cada campo de sección."

### 6.1 Los tres ejes

| Eje         | Responde                       | Ejemplos                                                                                 |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| **Zona**    | ¿Qué sección de la plataforma? | `catalog`, `leads`, `marketplace`, `organizations`, `settings`, `admin`                  |
| **Acción**  | ¿Qué puede hacer ahí?          | `read`, `create`, `update`, `delete`, `publish`, `unpublish`, `approve`, `manage_access` |
| **Alcance** | ¿De quién son los datos?       | `own` / `explicit` (set de orgs puntuales) / `all`                                       |

Un único modelo cubre los dos casos que el equipo presentó como separados: vendedor
Prosell solo-lectura de catálogo con orgs puntuales = `(catalog, read,
explicit=[org1, org3])`; manager viendo todos los leads agrupados por vendedor =
`(leads, read, all)`; vendedor viendo solo los suyos = `(leads, read, own)`.

### 6.2 Tablas (reemplazan el dict `ROLE_PERMISSIONS`)

- `permission_profiles` (`id`, `name`, `tenant_id` NULL si es plantilla global,
  `is_template`, `cloned_from_id`)
- `profile_grants` (`profile_id`, `zone`, `action`) — la matriz, editable desde UI
- `profile_scope` (`profile_id`, `scope_type`: own/explicit/all) +
  `profile_organization_access` (filas de organización cuando `scope_type=explicit`)
  — **tabla separada de `profile_grants` a propósito**, porque §3.1(3) confirmó que
  un clon hereda la matriz pero nunca el alcance.
- `user_profile_assignments` (`user_id`, `profile_id`)

**Regla de anti-escalación** (servicio de dominio, testeado aparte): al crear o
asignar un perfil, el motor valida que el set de grants resultante sea subconjunto
de lo que el actor que lo otorga ya tiene. Nadie otorga lo que no tiene — responde
directo a §3.1(4) (manager limitado a lo que `admin` le configure).

**Implementado (2026-10-06), con una pregunta abierta real sin resolver**:
`permission_escalation_guard.py` cubre la matriz zona×acción. La escalación de
**alcance** (ej. un actor con `ExplicitOrgsScope` otorgando `AllScope`) quedó
deliberadamente sin resolver — comparar dos `Scope` para "cuál es más permisivo"
no tiene respuesta de dominio puro cuando uno es `OwnScope` (su set permitido
depende de quién pregunta en cada request, no es un set fijo). Queda para el
ítem del dependency `require_zone_action`, que sí tiene el contexto del actor
real en cada request para resolverlo — no decidido por mi cuenta.

**Refinamiento al implementar (2026-10-06, regla 1 del workbook — re-verificar antes
de migrar)**: `permission_profiles` y `user_profile_assignments` NO se crearon como
tablas nuevas — ya existían, con otro nombre, más completas de lo que supuse acá.
Verificado en código: `roles.tenant_id` ya es nullable (global vs. por-org),
`roles.is_system_role` ya distingue fijo-vs-custom, y existe `user_roles` (junction
many-to-many) — y `User.has_permission()` YA itera `self.roles` (plural, semántica de
unión), no un solo rol. Reusar esto es DRY real (regla 11), no solo una preferencia
de estilo: inventar `permission_profiles`/`user_profile_assignments` en paralelo
hubiera duplicado una solución que el código ya tenía. Lo único genuinamente nuevo
son las 3 tablas de grant/alcance — **reemplazadas de nombre** para que calcen con
`roles` en vez de un `profile_id` inexistente: `role_grants` (↔ `profile_grants`),
`role_scope` + `role_organization_access` (↔ `profile_scope`/
`profile_organization_access`). La barrera real de §1.3(2) (`role_type` UNIQUE NOT
NULL, por la que `create_custom_role()` hardcodea `VIEWER`) se resolvió con
`role_type` nullable + índice único parcial (`WHERE role_type IS NOT NULL`) — los 6
roles fijos siguen únicos entre sí, un perfil custom puede tener `role_type=NULL`.
Migración `20261006_0001`, probada upgrade+downgrade+upgrade contra Postgres real y
contra staging (reinicio de contenedor, logs limpios). **Hallazgo aparte, sin
resolver, para el próximo ítem**: staging tiene 7 roles de sistema, no 6 — hay un
`vendedor` además de `sales_agent` (`is_system_role=true` en ambos) — no viene de
esta migración, probablemente un seed viejo; el ítem de migrar los 6 roles fijos a
plantillas necesita investigar esto antes de asumir que son exactamente 6.

**Mismo refinamiento aplicado a la entidad de dominio (2026-10-06)**: tampoco se
creó una clase `PermissionProfile` aparte — se extendió `Role`
(`domain/entities/role.py`) con `grants`/`scope`/`has_zone_action()`. Detalle
completo (incluido un ripple real que la suite completa atrapó —
`_to_entity()` rompía con `MissingGreenlet` por un choque de nombre entre
campo de dominio y relationship ORM) en el workbook, bloque 2.

### 6.3 Campo individual (no como eje del motor)

Ir hasta **campo** (ej. ocultar precio de costo) NO se modela como un cuarto eje
genérico — la combinatoria zona×acción×alcance×campo explota para casi ningún
beneficio real. Se resuelve aparte, a nivel de serialización del DTO, con un flag
puntual por campo sensible (ej. `catalog.view_cost_price`). El patrón ya existe en
el código: `PublicProductResponse` nunca incluye el teléfono de la organización, por
construcción — formalizarlo como un servicio chico y reutilizable en vez de
repetirlo ad hoc por DTO.

### 6.4 SOLID/DRY aplicado

- **Open/Closed**: agregar una zona (ej. `leads`, confirmada en §3.1(8)) es una fila
  de dato — cero código nuevo en el motor de chequeo.
- **Liskov**: los roles fijos de hoy (`super_admin`…`viewer`) se modelan como
  perfiles-plantilla que cumplen la misma interfaz que uno personalizado — nada de
  `if role_type == X` especial en ningún lado.
- **Dependency Inversion**: el dominio define `IPermissionChecker` (puerto); la
  infra lo implementa contra estas tablas. Un único FastAPI dependency
  (`require_zone_action(zone, action)`) reemplaza: el `RBACMiddleware` muerto
  (§3.1(5), confirmado para borrar), los +5 `current_user.has_permission(...)`
  repetidos a mano en `product_router.py` (§1.2), y el único uso real de
  `require_permission` de hoy. Una sola fuente de verdad por request — arregla de
  paso la relectura repetida de `is_org_admin` (§1.5).

  **Implementado (2026-10-06), con el "reemplaza" todavía pendiente de
  verdad**: `require_zone_action()` existe y está testeado (unit +
  integración, sesión async real), pero ningún router lo usa todavía — la
  migración de los call sites reales de `product_router.py` y el borrado
  de `RBACMiddleware` quedan como un paso separado y deliberado (no se
  mezcla "construir el dependency" con "cambiar autorización en producción"
  en el mismo diff). Detalle en el workbook, bloque 2.

- **Specification pattern** para el alcance: `OwnScope`/`AllScope`/
  `ExplicitOrgsScope` como objetos con un método `filter(query)`, sin `if/elif`
  esparcido por el código.

---

## 7. Catálogo público + landing page (marketplace-style)

Aclaración del equipo: el catálogo público no es un listado simple — es parte de la
**landing page**, con buscador y filtros, al estilo Marketplace/MercadoLibre.
Verificado en código: hoy **no existe nada de esto**.

- `apps/web/src/app/page.tsx` — landing actual, 88 líneas, sin buscador ni grilla.
- `apps/web/src/app/p/[slug]/` — única página pública existente, un producto por
  link secreto (la que tiene el leak de §4).
- No hay ningún endpoint de listado público — solo `GET /{slug}` individual.

**Quiénes son `sales_user`/`viewer` vs. el público** (respuesta a §3.1(7)): son
roles internos de staff de dealer, atados a `tenant_id` — nada que ver con el
visitante anónimo del catálogo público. El público nunca pasa por el RBAC interno;
usa un mecanismo separado, sin autenticación, por diseño (igual que hoy).

### Propuesta

- **Backend**: `GET /public/products` nuevo — sin auth, paginado, con filtros
  (categoría, rango de precio, condición, ubicación, búsqueda de texto), mismo motor
  de query que ya usa `list_products` internamente, detrás de un DTO público
  sanitizado desde el día uno (sin `tenant_id`/`organization_id` crudos — mismo fix
  de §4, aplicado acá también, no después).
- **Frontend**: la landing (`page.tsx`) pasa a tener buscador + grilla + filtros,
  cada card linkeando a `/p/[slug]` (ya existe) — reusa el patrón de card del
  catálogo interno (`/catalog`), no arranca de cero ahí.
- **Pregunta de producto abierta, no resuelta aquí**: si el catálogo público va a
  mostrar de qué dealer es cada auto sin exponer el UUID interno, probablemente haga
  falta un **nombre público del dealer** (campo nuevo en el DTO — hoy solo existe
  `contact_name`, que es una persona, no la organización).

---

## 8. Recomendación de proceso (actualizada)

Con las 8 preguntas respondidas (§3.1), el bug de §4 verificado, `fb-autopost`
validado (§5) y el diseño de §6-§7 propuesto, el espacio ya está acotado de verdad.
Separar en bloques:

1. **Fix del leak de §4** — chico, independiente, sin esperar nada más (mismo
   criterio que el bug del sidebar).
2. **Motor central** (§6: Zona/Acción/Alcance + reemplazo de `RBACMiddleware`/
   chequeos inline) — el más grande, el que amerita `/aidlc` (Domain Design + NFR
   Design) dado que toca seguridad multi-tenant y el proyecto ya tiene historial de
   leaks reales (van tres esta semana).
3. **UI de admin** para armar/clonar perfiles (depende de 2).
4. **Zona de Leads/CRM** (§3.1(8)) + **catálogo público/landing** (§7) — pueden
   avanzar en paralelo entre sí, cada uno depende solo del motor central (2), no uno
   del otro.
5. **Gestión de `product_fb_account_assignments`/`OrganizationMarketplaceAccessModel`
   desde la zona `marketplace`** (§5.2) — depende de 2; el mecanismo de
   automatización en sí (fb-autopost) no se toca, solo su capa de gestión humana.

Dado el historial de fugas cross-tenant reales (van tres), sea cual sea el orden,
esto necesita un piso de test más alto que lo normal antes de mergear — no
negociable, independiente del proceso elegido.

---

**Próximo paso**: decidir con qué bloque de §8 arrancar, y si el bloque 2 (motor
central) pasa por `/aidlc` o se diseña/implementa directo en bloques chicos.
