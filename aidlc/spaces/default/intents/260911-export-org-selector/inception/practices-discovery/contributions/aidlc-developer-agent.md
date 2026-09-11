**Collaborator:** aidlc-developer-agent

## Contribution

Evalué el draft del lead (`team-practices.md`, `discovered-rules.md`,
`evidence.md`) contra la evidencia de `code-structure.md`/
`component-inventory.md` desde la óptica de naming, layer boundaries,
manejo de errores, organización de archivos y code-style. Coincido con la
lectura general de "sin especialización nueva de práctica de equipo" y
agrego cuatro precisiones puntuales para que Requirements/Functional
Design las tengan en cuenta al resolver la bifurcación (a)/(b) — sin
resolverla yo acá:

1. **Boundary de ubicación de componente, no solo de estado.** El draft
   (§ Code Style) ya señala que, si se elige (a), el código de consumo
   debe seguir el patrón existente de `organizationStore.ts` sin agregar
   un segundo mecanismo de estado paralelo. Falta una precisión adicional
   de organización de archivos: `OrganizationPicker.tsx` vive hoy bajo
   `apps/web/src/components/admin/` (`component-inventory.md` L153), y se
   consume desde `Header.tsx` (contexto global/admin). El flujo que este
   intent toca es `apps/web/src/app/(seller)/catalog/page.tsx`
   (`code-structure.md` L178) — un route group `(seller)`, no `(admin)`.
   Si la vía (a) prospera, importar un componente de `components/admin/`
   dentro de una página de `(seller)` no rompe ninguna regla mecánica
   (no hay barrera de build entre route groups), pero sí es una
   inconsistencia de organización de carpetas que vale la pena que
   Functional Design decida explícitamente (¿mover/re-exportar el picker
   a una ubicación neutral tipo `components/shared/`, o aceptar el import
   cross-route-group tal cual?) en vez de que quede implícita en el código
   generado.

2. **Naming en el boundary API — camelCase interno vs. `organization_id`
   en el wire.** La convención ya afirmada es camelCase TS/JS y
   snake_case Python (`team.md` § Code Style). El endpoint backend ya
   resuelto usa `organization_id` (confirmado en `evidence.md` y en el
   intent previo `260910-export-cross-org`). Cualquier variable/prop
   nueva del lado frontend (ej. el id de organización elegido) debe
   nombrarse en camelCase (`organizationId` / `selectedOrgId`) y
   convertirse a `organization_id` recién en el punto de armado del
   query param o body hacia `exportCatalogClientFormat()` — igual que ya
   lo resuelve el resto de `products.ts` para otros parámetros snake_case
   del backend. No es una práctica nueva, es aplicar la convención ya
   vigente a esta superficie puntual; lo marco porque el draft no lo
   menciona explícitamente y es un punto fácil de calcar mal si alguien
   copia el naming del backend tal cual.

3. **Manejo de errores — distinguir el boundary de lectura (nuevo,
   si aplica) del boundary de escritura/acción (ya cubierto).** El
   mandate Q6 (excepciones tipadas + handler centralizado en frontend)
   ya se aplicó en `260903-catalog-client-export` al handler de acción
   (`handleExportClientFormat`/`exportCatalogClientFormat`), que según
   el learning ya persistido en `project.md` (2026-09-05) ya cubre
   200/404/413/`!res.ok` + un `catch` de red. Agregar el parámetro
   `organization_id` a esa misma llamada NO abre un boundary de error
   nuevo — hereda el manejo ya existente. Lo que SÍ puede ser un boundary
   nuevo, solo si se elige la vía (a) y este es el primer consumidor real
   de `viewingOrgId`, es el hook `useOrganizations()` (TanStack Query,
   `apps/web/src/lib/api/organizations.ts:75`, ya usado por
   `OrganizationPicker`) — ese es un boundary de LECTURA con su propio
   manejo de error de TanStack Query (`isError`/`error` de la query), no
   necesariamente el mismo patrón de excepción tipada + toast que Q6
   describe para acciones/mutaciones. El draft no distingue estos dos
   boundaries; vale la pena que Functional Design lo haga explícito para
   no forzar el patrón de mutación sobre un simple query de lectura ya
   resuelto por el hook existente.

4. **Ubicación de test — el gap ya documentado en `team.md` para
   `catalog/page.tsx` se hereda, no se resuelve solo.** `team.md` §
   Testing Posture ya deja pendiente para Build and Test cuál convención
   de ubicación de test aplica a `catalog/page.tsx` (no calza limpio en
   `tests/components/{module}/X.test.tsx` ni en el patrón co-located de
   páginas admin). Si la vía elegida es (b) — selector local nuevo
   propio del flujo de export — ese componente nuevo hereda la misma
   ambigüedad de ubicación (¿vive junto a `catalog/page.tsx` co-located,
   o en `tests/components/catalog/`?). Si es (a), el precedente ya es
   claro: `OrganizationPicker.test.tsx` está co-located junto al
   componente en `components/admin/`, y el test nuevo de consumo
   (wiring) seguiría ese mismo patrón sin ambigüedad. Este detalle
   condiciona parcialmente la bifurcación (a)/(b) desde el ángulo de
   organización de archivos de test, aunque la decisión de fondo siga
   siendo de Requirements/Functional Design.

No encontré nada en el draft que contradiga la baseline de `team.md`, ni
ninguna convención de naming/layer-boundary que el draft haya pasado por
alto de forma que amerite bloquear el avance de esta etapa — los cuatro
puntos de arriba son precisiones para etapas siguientes, no objeciones al
draft.

## Positions

- AGREE: la recomendación del lead de "sin especialización nueva de
  práctica de equipo" en las 5 secciones — la evidencia de
  `component-inventory.md`/`code-structure.md` sostiene que este intent
  reutiliza (o extiende junto a) mecanismos ya establecidos y probados
  (`OrganizationPicker`, `organizationStore`, Zustand, `useOrganizations()`),
  sin introducir un Unit, servicio o superficie de despliegue nueva.
- AGREE: no resolver la bifurcación (a)/(b) en Practices Discovery — es
  una decisión de diseño de producto/arquitectura de este feature
  puntual, no una práctica de equipo, consistente con el criterio ya
  aplicado en `260903-catalog-client-export` (decisiones de alcance de
  un intent van a `evidence.md`, no a `discovered-rules.md`).
- AGREE: el piso de test recomendado en `team-practices.md` § Testing
  Posture (caso explícito de "usuario sin permiso no ve el selector" +
  cobertura del lado de consumo sin reduplicar `OrganizationPicker.test.tsx`)
  es proporcional y sigue el patrón ya establecido de casos límite
  explícitos, no solo camino feliz.
- OBJECT: None.
