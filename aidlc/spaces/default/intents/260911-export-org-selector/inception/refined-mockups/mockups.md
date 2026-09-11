# Mockups — 260911-export-org-selector

Diseño derivado directamente de `stories.md` (AC1.1.5/AC1.1.6) y
`requirements.md` (FR1.3, Out of Scope) — sin wireframes/user-flow previos
(scope classic, sin Ideation, per convención ya reconfirmada). El alcance
visual es MÍNIMO: un agregado de texto a un componente existente
(`ExportSummaryBanner`). No hay pantalla ni componente nuevo.

## Pantalla: `/catalog` — flujo de exportar catálogo (formato cliente)

Sin cambios en el layout general de `/catalog` ni en el `OrganizationPicker`
del header (`component-inventory.md`, ya documentado). El único punto
tocado es el contenido del `ExportSummaryBanner`, que ya existe.

### Estado: Export cross-org (organización distinta elegida en el header)

```
┌─────────────────────────────────────────────────┐
│  Exportar catálogo (formato cliente)             │
│                                                   │
│  ╔═══════════════════════════════════════════╗  │
│  ║ 🏢 Exportando catálogo de: Acme Motors      ║  │  ← NUEVO (AC1.1.5)
│  ╚═══════════════════════════════════════════╝  │     badge destacado
│                                                   │
│  [resto del contenido actual del banner sin      │
│   cambios]                                       │
│                                                   │
│              [Cancelar]   [Continuar]            │
└─────────────────────────────────────────────────┘
```

### Estado: Export propia organización (comportamiento actual, sin cambios)

```
┌─────────────────────────────────────────────────┐
│  Exportar catálogo (formato cliente)             │
│                                                   │
│  [contenido actual del banner, SIN el badge de   │
│   organización — AC1.1.6]                        │
│                                                   │
│              [Cancelar]   [Continuar]            │
└─────────────────────────────────────────────────┘
```

### Estado: cross-org, nombre de organización todavía cargando (hallazgo Major del reviewer, resuelto)

```
┌─────────────────────────────────────────────────┐
│  Exportar catálogo (formato cliente)             │
│                                                   │
│  ╔═══════════════════════════════════════════╗  │
│  ║ 🏢 ░░░░░░░░░░░░░░░░░░░░░░░ (skeleton)       ║  │  ← NUEVO, obligatorio
│  ╚═══════════════════════════════════════════╝  │     nunca omitir el badge
│                                                   │     cuando hay org elegida
│  [resto del contenido actual del banner]         │
│                                                   │
│              [Cancelar]   [Continuar]            │
└─────────────────────────────────────────────────┘
```

El badge NUNCA se omite cuando `viewingOrgId` está seteado — mientras el
nombre no resolvió, muestra un skeleton en vez de desaparecer, para que
este estado nunca sea visualmente idéntico al de "organización propia"
(ver `interaction-spec.md` § States, unión discriminada `organization`).

### Estado: Catálogo vacío de la organización elegida (US2, AC2.1.1)

Mensaje de error existente, actualizado para mencionar la organización
explícitamente (ya especificado en `stories.md`, sin cambio de layout):

```
"La organización Acme Motors no tiene catálogo publicado para exportar."
```

### Estado: Catálogo vacío de la organización propia (US2, AC2.1.2) — sin cambios

Mensaje de error genérico ya existente hoy, sin ningún cambio — este
intent solo modifica el mensaje para el caso cross-org (arriba).

### Estado: Usuario sin permiso `ORG_ADMIN_VIEW_ALL` (US3)

Idéntico al comportamiento actual — sin `OrganizationPicker` en el header,
sin badge en el banner, sin ningún elemento nuevo (AC3.1.1–AC3.1.3).

## Review

**Verdict:** READY

**Findings:**

1. [Severidad: Major] — `interaction-spec.md` § Props/Inputs define
   `organizationName: string | undefined`, donde `undefined` se interpreta
   como "se exporta la organización propia — no se renderiza el badge"
   (AC1.1.6). Pero `organizationName` se lee vía `useOrganizations()`
   (TanStack Query), y esa misma condición (`undefined`) también ocurre
   mientras el nombre de una organización CROSS-ORG todavía no cargó (o
   falló al cargar). Ningún artefacto (mockups.md, interaction-spec.md,
   accessibility-checklist.md) define un estado de loading/error propio
   de esa lectura, distinto del caso "organización propia". Con el diseño
   actual, un banner cross-org que se abre antes de que el query resuelva
   se vería IDÉNTICO al banner de organización propia — exactamente el
   riesgo que AC1.1.5 busca mitigar ("exportar la organización equivocada
   sin darse cuenta"). — Ubicación: `interaction-spec.md` § States y §
   Props/Inputs, `mockups.md` (ninguno de los dos estados dibujados cubre
   esta transición). — Recomendación: agregar un tercer estado explícito
   (ej. "cargando nombre de organización cross-org" con un placeholder o
   skeleton en el badge, o bloquear la apertura del banner hasta que el
   nombre esté disponible) y distinguirlo del caso "organización propia"
   en el prop (ej. una unión discriminada `{ kind: "own" } | { kind:
"loading" } | { kind: "cross-org", name: string }` en vez de un solo
   `string | undefined`). En la práctica el riesgo puede ser bajo (el
   nombre ya suele estar cacheado por el propio `OrganizationPicker`),
   pero el diseño no lo dice ni lo descarta explícitamente — Functional
   Design necesita esta definición antes de Code Generation.

2. [Severidad: Minor] — El estado "catálogo vacío, propia organización"
   (AC2.1.2 — sin cambios respecto al mensaje actual) está cubierto en
   `interaction-spec.md` § States, pero `mockups.md` § Estados no lo
   incluye ni siquiera como "sin cambios" — solo lista el caso cross-org
   (AC2.1.1). Inconsistencia menor de completitud entre los dos
   documentos, no bloqueante porque el comportamiento igual queda
   documentado en `interaction-spec.md`. — Recomendación: agregar una
   línea breve en `mockups.md` § Estados señalando explícitamente que el
   caso de catálogo vacío en la organización propia queda "sin cambios",
   para que el documento de mockups sea autocontenido igual que el resto
   de la sección.

El resto del alcance visual está correctamente acotado: AC1.1.5/AC1.1.6 y
AC2.1.1 están cubiertos con precisión, no se contradice en ningún punto la
decisión de "sin selector nuevo" (FR1.3, `OrganizationPicker` sin cambios
en ningún estado dibujado), y el checklist de accesibilidad no
sobre-especifica controles interactivos que no existen (el badge está
correctamente tratado como no-interactivo en toda la documentación). Los
cuatro artefactos referencian con contenido real `stories.md` y
`requirements.md`; `team-practices.md` se referencia con contenido real en
`design-system-mapping.md`; la ausencia de `wireframes`/`user-flow` está
explícitamente reconocida y justificada (scope classic) en vez de omitida
en silencio.
