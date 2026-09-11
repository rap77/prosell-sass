**Collaborator:** aidlc-devsecops-agent

## Contribution

Evaluación de seguridad puntual para este intent (selector de organización
en el flujo de export de catálogo), centrada en mi alcance (lint/format,
SAST/DAST, secret/dependency scanning, supply-chain) y en el riesgo
central que el propio brief nombra: que un usuario sin `ORG_ADMIN_VIEW_ALL`
nunca vea el selector, no solo que no pueda usarlo.

**1. El guard doble ya existente es defensa en profundidad suficiente para
el dato — con una precisión que conviene fijar en Requirements/Functional
Design, no en esta etapa.** `OrganizationPicker.tsx` oculta el componente
a nivel de render (`!isAdmin → null`) y `organizationStore.setViewingOrgId()`
es no-op si el rol no tiene `Permission.ORG_ADMIN_VIEW_ALL`
(`component-inventory.md` L155). La autorización real y auditable de los
datos exportados vive 100% en el backend (`_check_org_scope_permission()`
del intent `260910-export-cross-org`, ya con 10/10 tests y logging de cada
export cross-org) — así que la superficie de riesgo de exfiltración de
datos cross-org NO depende del gating de UI: aunque un bug mostrara el
selector a quien no debería, el backend rechaza (403) o el store descarta
el `organization_id` en silencio. El riesgo real que sí introduce este
intent es de **UX de seguridad** (el humano no debe ver un control que no
puede usar), no de exposición de datos.

Dicho esto, señalo un gap de precisión que Requirements/Functional Design
debería cerrar explícitamente, sea cual sea la bifurcación (a)/(b) que se
elija: el guard de render usa `isAdmin` (booleano derivado de rol, vía
`useAuth()`), mientras que el guard real de autorización — tanto en el
store como en el backend — es el permiso puntual `ORG_ADMIN_VIEW_ALL`. Si
`isAdmin` no es exactamente equivalente a "tiene `ORG_ADMIN_VIEW_ALL`" (p.
ej. un rol admin sin ese permiso puntual, o viceversa un rol no-`isAdmin`
que sí lo tuviera), el componente nuevo podría mostrar el selector a quien
no corresponde según el propio criterio del feature — sin abrir una fuga
de datos (el store/backend igual lo bloquean), pero sí incumpliendo el
requisito explícito de "nunca verlo". Recomiendo que el código nuevo
chequee el permiso puntual directamente (mismo que verifica el backend),
no un proxy de rol — consistente con `deriveRole.ts` como single source of
truth ya establecido en el proyecto, y evita que un futuro cambio de rol
desalinee UI y backend sin que nadie lo note.

**2. Auditoría: no hace falta ningún control nuevo — ya está resuelta
aguas abajo.** El `logger.info()` de exports cross-org (patrón afirmado
en `project.md` para NFR de auditoría liviana, implementado en
`260910-export-cross-org`) registra la operación en el punto donde
realmente importa (el endpoint que sirve los datos), independientemente
de qué componente de UI haya originado el `organization_id`. Este intent
no necesita agregar logging de "quién abrió/usó el selector" — sería
duplicar una garantía que el backend ya cubre correctamente en el punto
de autorización real.

**3. Postura de pipeline de seguridad (sin SAST real, sin DAST, secret
scanning solo local) — sin gap nuevo que este intent destape.** Confirmo
sin objeción la evaluación del lead: es un cambio 100% frontend que
reutiliza componentes/hooks ya existentes y probados
(`OrganizationPicker`, `useOrganizations`, `organizationStore`), sin
dependencias nuevas y sin superficie de backend nueva — el
`_check_org_scope_permission()` que hace el trabajo pesado de
autorización ya fue auditado y testeado en el intent anterior. No veo
ningún vector (inyección, deserialización, manejo de archivos, secretos)
que este cambio puntual introduzca y que justifique por sí solo activar
SAST/DAST real o abrir el intent de seguridad dedicado ya diferido.

**4. Lint/format/dependency scanning: sin hallazgos.** GGA + ESLint
`--max-warnings=0` + react-doctor ya cubren el código React nuevo; no hay
librerías nuevas que agregar (todo el wiring usa hooks/stores/componentes
que ya están en el árbol de dependencias), así que no hay superficie
nueva de supply-chain (Dependabot `github-actions`-only sigue siendo
irrelevante para este cambio, igual que en intents previos de este
mismo flujo).

## Positions

- AGREE: El draft del lead — sin especialización nueva de práctica de
  equipo para este intent, tanto en Deployment (postura de pipeline
  aceptada con gaps no bloqueantes) como en Code Style (mandate Q6 de
  manejo de errores centralizado aplica igual que siempre a código
  nuevo). — el gating por permiso ya es un patrón establecido y auditado
  en el proyecto, y este intent no amplía la superficie de riesgo más
  allá de lo ya evaluado al construir `OrganizationPicker` originalmente.
- AGREE: El piso de test propuesto en `team-practices.md` § Testing
  Posture de exigir un caso explícito de "usuario sin el permiso no ve el
  selector", además del camino feliz — es la forma correcta de convertir
  el requisito de seguridad de UX en una regresión mecánica verificable.
- OBJECT: None — sin objeción de fondo al draft. Único punto a sumar
  (no una objeción, un refinamiento): que Requirements/Functional Design
  deje explícito que el condicional de gating del componente nuevo
  chequea el permiso puntual `ORG_ADMIN_VIEW_ALL` (o su derivación
  garantizada 1:1), no un booleano de rol más amplio como `isAdmin`, para
  que el criterio de "nunca ver el selector" quede alineado byte a byte
  con el criterio que el backend ya usa para autorizar.
