# Evidence — 260911-export-org-selector

## Sources

Paso 0 graphify-first ejecutado antes de cualquier lectura cruda (grafo
`graphify-out/graph.json`, 35211 nodos, fresco):

- `graphify query "OrganizationPicker component"` — confirmó que
  `OrganizationPicker.tsx` (`apps/web/src/components/admin/OrganizationPicker.tsx`)
  ya existe, tiene test dedicado (`OrganizationPicker.test.tsx`), se
  renderiza en `Header.tsx` (global), y se apoya en `useOrganizations()`
  (`apps/web/src/lib/api/organizations.ts`) y en
  `useOrganizationStore`/`organizationStore.ts` (Zustand).
- `graphify query "catalog page export button exportCatalogClientFormat organization_id"` —
  confirmó `exportCatalogClientFormat()` en `apps/web/src/lib/api/products.ts`
  y `catalog/page.tsx` como los dos puntos de wiring del flujo de export
  del lado frontend, y `export_catalog_client_format.py` +
  `Organization`/`AbstractOrganizationRepository` como la contraparte
  backend ya resuelta.
- `graphify explain "organizationStore viewingOrgId"` — ubicó la decisión
  de diseño original de `viewingOrgId` (Subsystem D, dealer ownership
  design), consistente con el hallazgo de reverse-engineering de que es
  un mecanismo global pensado para "ver como otra organización" en toda
  la app.

Lectura directa (no indexada de forma útil por graphify, o narrativa de
negocio que el AST no captura, per excepción ya documentada):

- `aidlc/spaces/default/memory/team.md` — baseline afirmada actual, 5
  secciones (Way of Working, Walking Skeleton, Testing Posture,
  Deployment, Code Style), construida a través de ~15 intents previos.
  Usada como punto de partida en `team-practices.md`.
- `aidlc/spaces/default/memory/org.md` — defaults del framework.
- `aidlc/spaces/default/memory/project.md` — corrections acumuladas,
  incluyendo dos learnings ya persistidos específicos de este intent
  (260911-export-org-selector) sobre `useOrganizations()` vs.
  `orgApi.list()` y sobre la política de focused scan en Reverse
  Engineering.
- Artefactos de reverse-engineering recién actualizados (focused scan de
  este mismo intent, `aidlc/spaces/default/codekb/prosell-sass/`):
  `code-structure.md` L170-193, `business-overview.md` L36/L60,
  `architecture.md` L577-665 (diagrama 14, bifurcación de diseño
  explícita), `component-inventory.md` L148-155, `code-quality-assessment.md`
  L159/#68/#75.

## Participantes y qué inspeccionó cada uno

- **Lead (Step 2, draft)**: leyó la baseline completa de `team.md`/`org.md`/
  `project.md`, los artefactos de reverse-engineering del focused scan, y
  evaluó las 5 secciones contra el contexto puntual del intent
  (selector cross-org 100% frontend, backend ya resuelto).
- **aidlc-quality-agent (revisión ciega)**: evaluó el piso de Testing
  Posture propuesto, propuso el piso mínimo de 3 puntos (gating negativo,
  wiring nuevo, no-regresión de `OrganizationPicker` si aplica), y
  confirmó `OrganizationPicker.test.tsx` como precedente de mocks
  directamente reusable (no solo transferible como patrón).
- **aidlc-developer-agent (revisión ciega)**: evaluó naming, layer
  boundaries, manejo de errores y organización de archivos contra
  `code-structure.md`/`component-inventory.md`; agregó 4 precisiones de
  aplicación de convención ya vigente (ubicación de componente
  cross-route-group, naming camelCase→`organization_id` en el boundary,
  distinción de boundary de lectura vs. escritura para manejo de
  errores, herencia del gap de ubicación de test de `catalog/page.tsx`).
- **aidlc-devsecops-agent (revisión ciega)**: evaluó el guard doble
  existente (`isAdmin` en UI + no-op en el store) como defensa en
  profundidad suficiente para el dato (la autorización real vive en el
  backend, ya auditado en `260910-export-cross-org`), confirmó que la
  auditoría vía `logger.info()` ya resuelta aguas abajo no necesita
  duplicarse, y señaló el matiz de chequear el permiso puntual
  `ORG_ADMIN_VIEW_ALL` en vez del proxy de rol `isAdmin`.

## Posiciones (Step 3, revisión ciega)

Las tres contribuciones — sin verse entre sí — llegaron a la misma
posición de fondo:

- **aidlc-quality-agent**: AGREE en las 3 posiciones declaradas (sin
  especialización nueva en Testing Posture; bifurcación (a)/(b) es
  decisión de diseño, no práctica de equipo; `OrganizationPicker.test.tsx`
  es precedente relevante). `OBJECT: None.`
- **aidlc-developer-agent**: AGREE en las 3 posiciones declaradas (sin
  especialización nueva en las 5 secciones; bifurcación (a)/(b) no se
  resuelve en Practices Discovery; el piso de test recomendado es
  proporcional). `OBJECT: None.`
- **aidlc-devsecops-agent**: AGREE en las 2 posiciones declaradas (sin
  especialización nueva en Deployment/Code Style; el piso de test
  propuesto convierte correctamente el requisito de seguridad de UX en
  regresión mecánica). `OBJECT: None` — con un refinamiento no-bloqueante
  (chequear el permiso puntual en vez de `isAdmin`).

**Resultado de la ronda de revisión ciega: 3/3 AGREE, 0/3 OBJECT.** No
hubo disputa genuina de conocimiento ni judgment call con posiciones
enfrentadas que ameritara una ronda 2 o escalación al humano antes de la
entrevista — todas las contribuciones fueron aditivas (precisiones para
Requirements/Functional Design), no correcciones al draft del lead.

## Entrevista humana (Step 4)

Dado el AGREE unánime sin objeciones de fondo, la entrevista se mantuvo
al piso mínimo: una sola pregunta (Q1), consistente con el patrón ya
reconfirmado varias veces en `project.md` de entrevistar solo las
especializaciones genuinamente nuevas cuando un re-run no encuentra
objeciones.

**Q1 — Piso mínimo de test para este intent.** Se presentó el piso de 3
puntos propuesto por quality (regresión negativa de gating, test de
wiring nuevo, no-regresión del `OrganizationPicker` si se reutiliza
`viewingOrgId`), con las opciones `A. Sí, afirmar los 3 puntos tal cual`,
`B. Ajustar el piso`, `X. Other (please specify)`.

**Respuesta afirmada**: `A. Sí, afirmar los 3 puntos tal cual`.

## Evaluación final: ¿hace falta especialización nueva de práctica de equipo?

**Decisión final: NO.** Confirmado por el lead, las tres revisiones
ciegas (0 objeciones de fondo) y el humano (que no usó la entrevista para
abrir ninguna de las otras 4 secciones), por las mismas razones ya
identificadas en el draft:

1. **Alcance**: cambio 100% frontend, dentro de un Unit ya existente
   (catálogo), que reutiliza (o construye junto a) componentes y
   patrones de estado ya establecidos y probados (`OrganizationPicker`,
   `organizationStore`, Zustand). No introduce un Unit, servicio, ni
   superficie de despliegue nueva.
2. **Precedente directo**: `260903-catalog-client-export` (el intent que
   originó el propio flujo de export que este intent extiende) ya pasó
   por esta misma evaluación con la misma conclusión — este intent es un
   sub-alcance aún más chico de esa misma superficie.
3. **Sin riesgo de seguridad/deployment nuevo**: el gating por permiso
   (`ORG_ADMIN_VIEW_ALL`) ya es un patrón establecido y auditado
   (`OrganizationPicker` ya lo implementa con doble guard), confirmado
   sin objeción por devsecops. La autorización real de los datos vive
   100% en el backend, ya auditado en `260910-export-cross-org`.
4. **La única decisión real pendiente es de DISEÑO de producto/
   arquitectura del feature** (bifurcación (a)/(b): reutilizar el
   mecanismo global vs. selector local), no una práctica de equipo —
   corresponde resolverla en Requirements Analysis/Functional Design, no
   en Practices Discovery. Las precisiones de developer (ubicación de
   componente, naming en el boundary, distinción de boundaries de
   error) y de devsecops (chequear el permiso puntual, no un proxy de
   rol) quedan documentadas en `team-practices.md` como insumo para esas
   etapas, sin promoverse a `discovered-rules.md` — son decisiones de
   alcance de este feature puntual, no restricciones de proceso de
   equipo general (mismo criterio ya aplicado en
   `260903-catalog-client-export`).

**Consecuencia**: `discovered-rules.md` queda con `## Mandated` y
`## Forbidden` vacíos. El único artefacto nuevo de proceso para este
intent es el piso mínimo de test de 3 puntos, documentado en
`team-practices.md` § Testing Posture como piso específico del intent
(no una práctica de equipo general).

## Riesgos/gaps a vigilar (no bloqueantes para este stage)

- La bifurcación de diseño (a)/(b) del mecanismo de selección determina
  el piso de test exacto — el piso de 3 puntos afirmado es válido bajo
  cualquiera de las dos vías, pero Requirements Analysis/Functional
  Design debe resolver la bifurcación antes de escribir el código.
- `organizationStore.viewingOrgId` está "dormido" — si se elige la vía
  (a), este sería su primer consumidor real de datos en toda la app;
  vale la pena que Requirements Analysis confirme explícitamente que no
  hay otro efecto colateral esperado en otras partes de la UI que lean
  (todavía sin usar) ese mismo store.
- Gap heredado sin resolver: `catalog/page.tsx` no calza limpio en
  ninguno de los dos patrones de ubicación de test vigentes — Build and
  Test debe resolverlo antes de escribir los tests del selector/wiring
  de este intent (ver `team-practices.md` § Testing Posture).
- Gap adyacente NO absorbido en el piso de este intent: `handleExportCsv`/
  `exportCatalogCsv` en `catalog/page.tsx` siguen sin cobertura (señalado
  en `team.md` desde `260903-catalog-client-export`, no confirmado si ya
  se resolvió) — es código pre-existente no tocado por este intent, el
  piso de "test-after sin backfill" aplica; Build and Test debe
  verificar el estado actual antes de asumir qué ya está cubierto.
