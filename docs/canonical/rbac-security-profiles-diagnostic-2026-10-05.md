# Diagnóstico: RBAC, Visibilidad de Datos y Perfiles de Seguridad

> **Fecha**: 2026-10-05 · **Tipo**: Diagnóstico técnico, no una decisión de diseño.
> Cada afirmación de este documento está verificada contra el código real (commit
> `a3eb9541`), no contra lo que el nombre de una clase o un test sugiere. Donde no
> verifiqué algo a fondo, lo digo explícitamente en vez de asumir.
>
> **Propósito**: servir de insumo para decidir cómo diseñar e implementar un sistema
> de roles/permisos dinámico y administrable — empezando por `super_admin` y bajando
> hacia perfiles personalizados con visibilidad de datos y acceso a zonas de la
> plataforma — sin repetir trabajo si más adelante esto pasa por un flujo formal
> (AIDLC u otro).

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

## 4. Recomendación de proceso

Tu preocupación con `/aidlc` es legítima: si el problema no está bien acotado antes
de entrar a Domain Design, la ceremonia no previene gaps — los esconde detrás de más
documentación, y terminás rehaciendo trabajo igual. Pero la causa de ese fracaso casi
siempre es la misma: se salta la etapa de "entender qué hay" y se va directo a
"diseñar qué debería haber".

Este documento **es** esa etapa — es, de hecho, el insumo que las etapas de
Feasibility/Reverse Engineering de AIDLC piden como punto de partida. Mi recomendación
concreta:

1. Contestá las 8 preguntas de §3 (podés hacerlo acá, en el chat, no hace falta
   ceremonia para esa parte).
2. Con esas respuestas, el espacio de diseño queda acotado de verdad — y recién ahí
   decidimos si el tamaño real justifica pasar por `/aidlc` (Domain Design + NFR
   Design, dado que esto toca seguridad multi-tenant) o si alcanza con que yo
   escriba el diseño técnico directo y lo implementemos en bloques chicos, mismo
   estilo que usamos esta semana para los tres items de deuda técnica.
3. Dado el historial del proyecto con fugas cross-tenant reales (ya arreglé dos esta
   semana), sea cual sea la vía elegida, esto necesita un piso de test más alto que
   lo normal antes de mergear — eso no es negociable independientemente del proceso.

---

**Próximo paso**: tus respuestas a las 8 preguntas de §3.
