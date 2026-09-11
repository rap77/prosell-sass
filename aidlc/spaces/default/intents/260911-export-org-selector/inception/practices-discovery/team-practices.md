# Team Practices — 260911-export-org-selector

> Integración final (Step 5) de `practices-discovery`. Re-run sobre una
> baseline extensa y ya afirmada en `aidlc/spaces/default/memory/team.md`
> (~15 intents previos). Integra el draft del lead (Step 2), las tres
> revisiones ciegas (quality/developer/devsecops — las tres AGREE de
> fondo, cero OBJECT) y la entrevista humana (Step 4, Q1 afirmada tal
> cual: "A. Sí, afirmar los 3 puntos tal cual").

## Contexto del intent

Agregar un selector de organización, visible solo para usuarios con
permiso `ORG_ADMIN_VIEW_ALL`, en el flujo de exportar catálogo de
`/catalog`, cableado hasta `exportCatalogClientFormat(organization_id)`.
El backend ya quedó resuelto en el intent previo `260910-export-cross-org`
(endpoint acepta `organization_id`, permiso verificado, 10/10 tests). Este
intent es prácticamente 100% frontend: un componente/wiring nuevo en
React, con la decisión de diseño abierta de si reutiliza el mecanismo
global ya existente pero dormido (`OrganizationPicker.tsx` +
`organizationStore.viewingOrgId`) o si arma un selector local acotado al
flujo de export — esa bifurcación queda para Requirements
Analysis/Functional Design, no se resuelve en esta etapa.

## Way of Working

Baseline afirmada (sin cambios propuestos):

- Trunk-based development, ramas de feature de corta duración con
  prefijos convencionales (`fix/`, `feat/`, `chore/`, `refactor/`,
  `test/`), todas apuntando a `main`.
- Convención de nombre de rama: `<tipo>/<slug-descriptivo-en-inglés>`.
- Squash-merge (afirmado Q1 en 260829).
- Conventional Commits estricto.

**Sin especialización nueva para este intent (confirmado por el lead y
las tres revisiones ciegas sin objeción)**: el feature es una adición de
código dentro de una Unit frontend ya existente (catálogo), mismo patrón
que el precedente ya documentado en `team.md` para
`260903-catalog-client-export` ("el feature de export es una adición de
código dentro de un Unit existente... sin necesidad de rama ni convención
distinta"). No hay razón para tratar este intent distinto.

## Walking Skeleton

Baseline afirmada: no se corre la ceremonia de walking skeleton (Q2 en
260829, NEVER en `project.md`).

**Sin especialización nueva para este intent (confirmado por el lead y
las tres revisiones ciegas sin objeción)**: el feature es más
autocontenido todavía que `260903-catalog-client-export` — reutiliza (o
construye junto a) un componente (`OrganizationPicker`) y un store
(`organizationStore`) ya existentes, probados y en producción (aunque hoy
sin consumidores de datos); no requiere ninguna porción end-to-end nueva
para "probar que las piezas conectan". El backend ya está resuelto y
verificado en vivo desde el intent anterior.

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implementar la capa aplicable (en este intent, frontend)
  y luego escribir y correr los tests de esa capa, sin backfillear
  cobertura en código pre-existente no tocado por el cambio.
- Piso de cobertura asimétrico aceptado (40% frontend, sin piso enforced
  en backend) — no forzar simetría.
- CI corre la suite completa en cada push/PR; pre-push local corre
  `pytest -q`.
- Asimetría de gates de lint intencional (`next-lint` solo CI,
  `react-doctor` bloqueante en pre-commit).

**Sin especialización nueva de fondo para este intent** en metodología,
ordering, piso de cobertura general ni gates de CI — el marco general
sigue vigente sin cambios (confirmado por el lead y las tres revisiones
ciegas sin objeción).

**Piso mínimo obligatorio de test para ESTE INTENT (Q1, afirmado en la
entrevista: "A. Sí, afirmar los 3 puntos tal cual") — no cambia el piso
general del proyecto, solo aplica al feature de selector de organización
para export:**

1. **Regresión negativa explícita de gating por permiso, no solo camino
   feliz**: un caso de test donde el usuario NO tiene
   `ORG_ADMIN_VIEW_ALL` debe demostrar que (a) el selector no se
   renderiza / no está disponible en el flujo de export, y (b)
   `exportCatalogClientFormat()` se invoca sin `organization_id` (o con
   el comportamiento por defecto del propio tenant), nunca con un
   `organization_id` ajeno — sigue el patrón ya establecido en `team.md`
   de exigir casos límite explícitos, no solo un camino feliz.
2. **Test del wiring nuevo**: confirmar que el `organization_id` elegido
   llega correctamente a `exportCatalogClientFormat()` — es superficie de
   test completamente nueva, no hay nada pre-existente que "mantener en
   verde" acá.
3. **Si la vía de diseño elegida en Requirements/Functional Design
   reutiliza `organizationStore.viewingOrgId`** (el mecanismo global ya
   existente): verificar que consumirlo desde el flujo de export no
   rompe el consumo existente del `OrganizationPicker` en el header —
   mismo store, dos consumidores; alcanza con confirmar que el selector
   de export lee/escribe el mismo store sin introducir un segundo
   mecanismo de estado paralelo, no hace falta un test de integración
   cross-componente completo.

`OrganizationPicker.test.tsx` es directamente reusable como precedente de
mocks (`useAuth`, `useOrganizations`, `useOrganizationStore`) para
cualquiera de las dos vías de diseño — Build and Test debe reusar ese
mismo patrón de mocks en vez de inventar uno nuevo.

**Gap heredado, no resuelto por este intent (documentado por
trazabilidad, no piso nuevo)**: `team.md` ya deja pendiente para Build
and Test cuál convención de ubicación de test aplica a
`catalog/page.tsx` (no calza limpio en
`tests/components/{module}/X.test.tsx` ni en el patrón co-located de
páginas admin). Este intent agrega tests nuevos exactamente en esa zona
gris — Build and Test debe resolver explícitamente cuál convención aplica
antes de escribir los tests del selector/wiring, para no reabrir la
ambigüedad por segunda vez sin decisión. Si la vía elegida reutiliza
`OrganizationPicker`, el precedente ya es claro (co-located en
`components/admin/`); si es un selector local nuevo, hereda la misma
ambigüedad que `catalog/page.tsx`.

## Deployment

Baseline afirmada: deploy-on-merge a staging, gate manual de producción
permanente, health check post-deploy, postura de seguridad de pipeline
con gaps aceptados y no bloqueantes.

**Sin especialización nueva para este intent (confirmado por el lead y
las tres revisiones ciegas sin objeción)**: es un cambio de UI dentro de
`apps/web` que sigue el mismo camino de deploy que cualquier otro cambio
frontend — no cambia topología de entornos ni introduce un componente
nuevo desplegable. Ninguno de los riesgos de este intent (exposición de
datos cross-org a un usuario sin permiso, en caso de bug de gating) es
nuevo respecto a los riesgos ya evaluados y aceptados para
`OrganizationPicker` cuando se construyó originalmente (Subsystem D). La
autorización real y auditable de los datos exportados sigue viviendo
100% en el backend (`_check_org_scope_permission()`, ya auditado y
testeado en `260910-export-cross-org`); el gating de UI de este intent es
una capa de UX de seguridad, no la barrera real de exfiltración de datos.

## Code Style

Baseline afirmada: Ruff+Pyright backend, Prettier+ESLint frontend
(`--max-warnings=0` en CI), GGA bloqueante en pre-commit, naming
camelCase TS/snake_case Python, patrón de manejo de errores centralizado
en frontend (mandate Q6 en 260829, aplica a código nuevo).

**Sin especialización nueva de convención de nombres o formatter para
este intent (confirmado por el lead y las tres revisiones ciegas sin
objeción)**. Precisiones de aplicación de la convención ya vigente,
documentadas para Requirements/Functional Design (no son prácticas
nuevas, son la convención ya afirmada aplicada a esta superficie
puntual):

- Si la bifurcación (a)/(b) se resuelve por (a), el nuevo código de
  consumo debe seguir el patrón ya existente en `organizationStore.ts`
  (Zustand) sin agregar un segundo mecanismo de estado paralelo para lo
  mismo.
- Naming en el boundary: cualquier variable/prop nueva del lado frontend
  (el id de organización elegido) se nombra en camelCase
  (`organizationId` / `selectedOrgId`) y se convierte a
  `organization_id` recién en el punto de armado del query
  param/body hacia `exportCatalogClientFormat()` — igual que ya resuelve
  el resto de `products.ts` para otros parámetros snake_case del
  backend.
- El mandate Q6 de manejo de errores centralizado en frontend aplica
  igual que en `260903-catalog-client-export` a cualquier boundary nuevo.
  Agregar el parámetro `organization_id` a
  `exportCatalogClientFormat()` no abre un boundary de error nuevo —
  hereda el manejo ya existente (200/404/413/`!res.ok` + `catch` de red,
  ya persistido como learning de `project.md`). Si la vía elegida es (a)
  y este es el primer consumidor real de `viewingOrgId`, el hook
  `useOrganizations()` (TanStack Query) es un boundary de LECTURA con su
  propio manejo de error (`isError`/`error` de la query) — no
  necesariamente el mismo patrón de excepción tipada + toast que Q6
  describe para acciones/mutaciones; Functional Design debe dejarlo
  explícito para no forzar el patrón de mutación sobre un query de
  lectura ya resuelto por el hook existente.
- Gating por permiso: el condicional del componente nuevo debe chequear
  el permiso puntual `ORG_ADMIN_VIEW_ALL` directamente (mismo criterio
  que ya verifica el backend), no un proxy de rol como `isAdmin` —
  consistente con `deriveRole.ts` como single source of truth ya
  establecido en el proyecto. Esto evita que un futuro cambio de rol
  desalinee el gating de UI del criterio real de autorización, aunque no
  hay fuga de datos posible (el store/backend igual bloquean) porque el
  guard de UI es una capa adicional de UX de seguridad, no la barrera de
  autorización real.
- Organización de archivos: `OrganizationPicker.tsx` vive bajo
  `apps/web/src/components/admin/` y se consume hoy desde un contexto
  global/admin (`Header.tsx`); el flujo que este intent toca es
  `apps/web/src/app/(seller)/catalog/page.tsx` (route group `(seller)`).
  Si la vía (a) prospera, Functional Design debe decidir explícitamente
  si el import cross-route-group se acepta tal cual o si el picker se
  mueve/re-exporta a una ubicación neutral (ej. `components/shared/`),
  en vez de dejarlo implícito en el código generado.
